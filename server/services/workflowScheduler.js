/**
 * 📅 Workflow Scheduler
 * Handles scheduled workflow executions with cron-like functionality
 */

import { EventEmitter } from 'events'
import { logger } from '../middleware/errorHandler.js'
import { CalendarIntegrationService } from './calendarIntegration.js'

export class WorkflowScheduler extends EventEmitter {
  constructor(supabase, workflowEngine) {
    super()
    this.supabase = supabase
    this.workflowEngine = workflowEngine
    this.scheduledJobs = new Map()
    this.isRunning = false
    this.calendarService = new CalendarIntegrationService(supabase)
    
    // Bind methods
    this.start = this.start.bind(this)
    this.stop = this.stop.bind(this)
    this.scheduleWorkflow = this.scheduleWorkflow.bind(this)
  }

  /**
   * Start the scheduler
   */
  async start() {
    if (this.isRunning) {
      return
    }

    this.isRunning = true
    logger.info('Starting workflow scheduler')

    // Load existing scheduled workflows from database
    await this.loadScheduledWorkflows()

    // Start the main scheduler loop
    this.schedulerInterval = setInterval(() => {
      this.processScheduledJobs()
    }, 60000) // Check every minute

    this.emit('schedulerStarted')
  }

  /**
   * Stop the scheduler
   */
  async stop() {
    if (!this.isRunning) {
      return
    }

    this.isRunning = false
    logger.info('Stopping workflow scheduler')

    // Clear the scheduler interval
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval)
      this.schedulerInterval = null
    }

    // Cancel all scheduled jobs
    this.scheduledJobs.clear()

    this.emit('schedulerStopped')
  }

  /**
   * Load scheduled workflows from database
   */
  async loadScheduledWorkflows() {
    try {
      const { data: workflows, error } = await this.supabase
        .from('workflows')
        .select('id, name, user_id, organization_id, schedule_config')
        .eq('status', 'active')
        .not('schedule_config', 'is', null)

      if (error) {
        logger.error('Failed to load scheduled workflows', { error: error.message })
        return
      }

      logger.info('Loading scheduled workflows', { count: workflows.length })

      for (const workflow of workflows) {
        if (workflow.schedule_config && workflow.schedule_config.enabled) {
          this.addScheduledJob(workflow)
        }
      }

    } catch (error) {
      logger.error('Error loading scheduled workflows', { error: error.message })
    }
  }

  /**
   * Schedule a workflow for execution
   */
  async scheduleWorkflow(workflowId, scheduleConfig, userId, organizationId = null) {
    try {
      logger.info('Scheduling workflow', { workflowId, scheduleConfig })

      // Validate schedule configuration
      if (!this.validateScheduleConfig(scheduleConfig)) {
        throw new Error('Invalid schedule configuration')
      }

      // Update workflow with schedule config
      const { error: updateError } = await this.supabase
        .from('workflows')
        .update({ 
          schedule_config: scheduleConfig,
          updated_at: new Date().toISOString()
        })
        .eq('id', workflowId)

      if (updateError) {
        throw new Error(`Failed to update workflow schedule: ${updateError.message}`)
      }

      // Add to in-memory scheduler
      const workflow = {
        id: workflowId,
        user_id: userId,
        organization_id: organizationId,
        schedule_config: scheduleConfig
      }

      this.addScheduledJob(workflow)

      logger.info('Workflow scheduled successfully', { workflowId })
      return true

    } catch (error) {
      logger.error('Failed to schedule workflow', { 
        workflowId, 
        error: error.message 
      })
      throw error
    }
  }

  /**
   * Remove a scheduled workflow
   */
  async unscheduleWorkflow(workflowId) {
    try {
      logger.info('Unscheduling workflow', { workflowId })

      // Remove schedule config from database
      const { error: updateError } = await this.supabase
        .from('workflows')
        .update({ 
          schedule_config: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', workflowId)

      if (updateError) {
        throw new Error(`Failed to remove workflow schedule: ${updateError.message}`)
      }

      // Remove from in-memory scheduler
      this.scheduledJobs.delete(workflowId)

      logger.info('Workflow unscheduled successfully', { workflowId })
      return true

    } catch (error) {
      logger.error('Failed to unschedule workflow', { 
        workflowId, 
        error: error.message 
      })
      throw error
    }
  }

  /**
   * Add a job to the in-memory scheduler
   */
  addScheduledJob(workflow) {
    const jobData = {
      id: workflow.id,
      name: workflow.name,
      userId: workflow.user_id,
      organizationId: workflow.organization_id,
      schedule: workflow.schedule_config,
      lastRun: null,
      nextRun: this.calculateNextRun(workflow.schedule_config),
      enabled: workflow.schedule_config.enabled !== false
    }

    this.scheduledJobs.set(workflow.id, jobData)
    
    logger.debug('Added scheduled job', { 
      workflowId: workflow.id, 
      nextRun: jobData.nextRun 
    })
  }

  /**
   * Process all scheduled jobs
   */
  async processScheduledJobs() {
    if (!this.isRunning) {
      return
    }

    const now = new Date()
    const jobsToRun = []

    // Find jobs that need to run
    for (const [workflowId, job] of this.scheduledJobs) {
      if (job.enabled && job.nextRun && now >= job.nextRun) {
        jobsToRun.push(job)
      }
    }

    if (jobsToRun.length === 0) {
      return
    }

    logger.info('Processing scheduled jobs', { count: jobsToRun.length })

    // Execute jobs
    for (const job of jobsToRun) {
      try {
        await this.executeScheduledJob(job)
      } catch (error) {
        logger.error('Scheduled job execution failed', { 
          workflowId: job.id, 
          error: error.message 
        })
      }
    }
  }

  /**
   * Execute a scheduled job
   */
  async executeScheduledJob(job) {
    try {
      logger.info('Executing scheduled job', { workflowId: job.id })

      // Execute the workflow
      const execution = await this.workflowEngine.execute(
        job.id,
        job.userId,
        job.organizationId,
        {
          trigger: 'scheduled',
          scheduledAt: new Date().toISOString()
        }
      )

      // Update job status
      job.lastRun = new Date()
      job.nextRun = this.calculateNextRun(job.schedule, job.lastRun)

      // Log execution record
      await this.logScheduledExecution(job.id, execution.id, 'success')

      this.emit('jobExecuted', { job, execution })
      
      logger.info('Scheduled job executed successfully', { 
        workflowId: job.id, 
        executionId: execution.id,
        nextRun: job.nextRun
      })

    } catch (error) {
      // Update job with error
      job.lastRun = new Date()
      job.nextRun = this.calculateNextRun(job.schedule, job.lastRun)

      // Log execution failure
      await this.logScheduledExecution(job.id, null, 'failed', error.message)

      this.emit('jobFailed', { job, error })
      
      logger.error('Scheduled job execution failed', { 
        workflowId: job.id, 
        error: error.message,
        nextRun: job.nextRun
      })
    }
  }

  /**
   * Calculate next run time based on schedule
   */
  calculateNextRun(scheduleConfig, fromDate = null) {
    const base = fromDate || new Date()
    
    switch (scheduleConfig.type) {
      case 'interval':
        return this.calculateIntervalNextRun(base, scheduleConfig.interval)
      
      case 'cron':
        return this.calculateCronNextRun(base, scheduleConfig.cron)
      
      case 'daily':
        return this.calculateDailyNextRun(base, scheduleConfig.time)
      
      case 'weekly':
        return this.calculateWeeklyNextRun(base, scheduleConfig.dayOfWeek, scheduleConfig.time)
      
      case 'monthly':
        return this.calculateMonthlyNextRun(base, scheduleConfig.dayOfMonth, scheduleConfig.time)
      
      default:
        logger.error('Unknown schedule type', { type: scheduleConfig.type })
        return null
    }
  }

  /**
   * Calculate next run for interval-based schedules
   */
  calculateIntervalNextRun(base, interval) {
    const next = new Date(base.getTime())
    
    switch (interval.unit) {
      case 'minutes':
        next.setMinutes(next.getMinutes() + interval.value)
        break
      case 'hours':
        next.setHours(next.getHours() + interval.value)
        break
      case 'days':
        next.setDate(next.getDate() + interval.value)
        break
      default:
        logger.error('Unknown interval unit', { unit: interval.unit })
        return null
    }
    
    return next
  }

  /**
   * Calculate next run for daily schedules
   */
  calculateDailyNextRun(base, time) {
    const [hours, minutes] = time.split(':').map(Number)
    const next = new Date(base)
    
    next.setHours(hours, minutes, 0, 0)
    
    // If time has passed today, schedule for tomorrow
    if (next <= base) {
      next.setDate(next.getDate() + 1)
    }
    
    return next
  }

  /**
   * Calculate next run for weekly schedules
   */
  calculateWeeklyNextRun(base, dayOfWeek, time) {
    const [hours, minutes] = time.split(':').map(Number)
    const next = new Date(base)
    
    // Set to target day of week (0 = Sunday, 1 = Monday, etc.)
    const daysUntilTarget = (dayOfWeek - base.getDay() + 7) % 7
    next.setDate(next.getDate() + daysUntilTarget)
    next.setHours(hours, minutes, 0, 0)
    
    // If it's today but time has passed, schedule for next week
    if (daysUntilTarget === 0 && next <= base) {
      next.setDate(next.getDate() + 7)
    }
    
    return next
  }

  /**
   * Calculate next run for monthly schedules
   */
  calculateMonthlyNextRun(base, dayOfMonth, time) {
    const [hours, minutes] = time.split(':').map(Number)
    const next = new Date(base)
    
    next.setDate(dayOfMonth)
    next.setHours(hours, minutes, 0, 0)
    
    // If day has passed this month, schedule for next month
    if (next <= base) {
      next.setMonth(next.getMonth() + 1)
    }
    
    // Handle case where target day doesn't exist in next month
    if (next.getDate() !== dayOfMonth) {
      // Go to last day of month
      next.setMonth(next.getMonth() + 1, 0)
    }
    
    return next
  }

  /**
   * Basic cron expression parser (simplified)
   */
  calculateCronNextRun(base, cronExpression) {
    // This is a simplified cron parser
    // In production, use a proper cron library like 'node-cron'
    logger.warn('Cron expressions not fully implemented', { cronExpression })
    
    // Default to hourly for now
    const next = new Date(base)
    next.setHours(next.getHours() + 1)
    return next
  }

  /**
   * Validate schedule configuration
   */
  validateScheduleConfig(config) {
    if (!config || typeof config !== 'object') {
      return false
    }

    if (!config.type) {
      return false
    }

    switch (config.type) {
      case 'interval':
        return config.interval && 
               config.interval.unit && 
               typeof config.interval.value === 'number' &&
               config.interval.value > 0

      case 'daily':
        return config.time && /^\d{2}:\d{2}$/.test(config.time)

      case 'weekly':
        return config.dayOfWeek >= 0 && 
               config.dayOfWeek <= 6 && 
               config.time && 
               /^\d{2}:\d{2}$/.test(config.time)

      case 'monthly':
        return config.dayOfMonth >= 1 && 
               config.dayOfMonth <= 31 && 
               config.time && 
               /^\d{2}:\d{2}$/.test(config.time)

      case 'cron':
        return config.cron && typeof config.cron === 'string'

      default:
        return false
    }
  }

  /**
   * Log scheduled execution
   */
  async logScheduledExecution(workflowId, executionId, status, error = null) {
    try {
      await this.supabase
        .from('scheduled_executions')
        .insert([{
          workflow_id: workflowId,
          execution_id: executionId,
          status,
          error_message: error,
          scheduled_at: new Date().toISOString()
        }])
    } catch (logError) {
      logger.error('Failed to log scheduled execution', { 
        workflowId, 
        error: logError.message 
      })
    }
  }

  /**
   * Get scheduled jobs status
   */
  getScheduledJobs() {
    return Array.from(this.scheduledJobs.values()).map(job => ({
      id: job.id,
      name: job.name,
      enabled: job.enabled,
      lastRun: job.lastRun,
      nextRun: job.nextRun,
      scheduleType: job.schedule.type
    }))
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      scheduledJobsCount: this.scheduledJobs.size,
      enabledJobsCount: Array.from(this.scheduledJobs.values()).filter(j => j.enabled).length
    }
  }
}