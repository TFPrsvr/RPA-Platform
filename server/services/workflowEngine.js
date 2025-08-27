/**
 * ⚙️ Workflow Execution Engine
 * Handles the execution of RPA workflows with step-by-step processing
 */

import { EventEmitter } from 'events'
import { logger } from '../middleware/errorHandler.js'
import { StepProcessor } from './stepProcessor.js'

export class WorkflowEngine extends EventEmitter {
  constructor(supabase) {
    super()
    this.supabase = supabase
    this.stepProcessor = new StepProcessor()
    this.activeExecutions = new Map()
    this.executionQueue = []
    this.maxConcurrentExecutions = 5
    this.processingQueue = false

    // Bind methods to preserve context
    this.execute = this.execute.bind(this)
    this.processQueue = this.processQueue.bind(this)
    
    // Start queue processing
    this.startQueueProcessor()
  }

  /**
   * Execute a workflow
   */
  async execute(workflowId, userId, organizationId = null, options = {}) {
    try {
      logger.info('Starting workflow execution', { workflowId, userId, organizationId })

      // Get workflow details
      const { data: workflow, error: workflowError } = await this.supabase
        .from('workflows')
        .select('*')
        .eq('id', workflowId)
        .single()

      if (workflowError || !workflow) {
        throw new Error(`Workflow not found: ${workflowId}`)
      }

      if (workflow.status !== 'active') {
        throw new Error(`Workflow is not active: ${workflow.status}`)
      }

      // Create execution record
      const { data: execution, error: executionError } = await this.supabase
        .from('workflow_executions')
        .insert([{
          workflow_id: workflowId,
          user_id: userId,
          organization_id: organizationId,
          status: 'pending',
          started_at: new Date().toISOString(),
          execution_data: {
            workflow_name: workflow.name,
            total_steps: workflow.steps?.length || 0,
            options
          }
        }])
        .select()
        .single()

      if (executionError) {
        throw new Error(`Failed to create execution record: ${executionError.message}`)
      }

      // Create execution context
      const executionContext = {
        id: execution.id,
        workflowId,
        userId,
        organizationId,
        workflow,
        execution,
        options,
        variables: { ...workflow.variables, ...options.variables },
        currentStepIndex: 0,
        stepResults: [],
        errors: [],
        startTime: Date.now(),
        status: 'running'
      }

      // Add to queue or execute immediately
      if (this.activeExecutions.size >= this.maxConcurrentExecutions) {
        this.executionQueue.push(executionContext)
        logger.info('Execution queued', { executionId: execution.id })
      } else {
        await this.executeWorkflow(executionContext)
      }

      return execution

    } catch (error) {
      logger.error('Failed to start workflow execution', { 
        error: error.message, 
        workflowId, 
        userId 
      })
      throw error
    }
  }

  /**
   * Execute workflow with steps
   */
  async executeWorkflow(context) {
    try {
      this.activeExecutions.set(context.id, context)
      
      logger.info('Executing workflow', { 
        executionId: context.id,
        workflowName: context.workflow.name,
        totalSteps: context.workflow.steps?.length || 0
      })

      // Update execution status
      await this.updateExecutionStatus(context.id, 'running', {
        started_at: new Date().toISOString()
      })

      this.emit('executionStarted', context)

      // Execute each step
      const steps = context.workflow.steps || []
      
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i]
        context.currentStepIndex = i

        logger.debug('Executing step', { 
          executionId: context.id,
          stepIndex: i,
          stepType: step.type,
          stepId: step.id
        })

        this.emit('stepStarted', { context, step, stepIndex: i })

        try {
          // Process step
          const stepResult = await this.stepProcessor.processStep(step, context)
          
          context.stepResults.push({
            stepIndex: i,
            stepId: step.id,
            stepType: step.type,
            success: true,
            result: stepResult,
            timestamp: new Date().toISOString(),
            executionTime: stepResult.executionTime || 0
          })

          // Update variables if step returned new values
          if (stepResult.variables) {
            context.variables = { ...context.variables, ...stepResult.variables }
          }

          this.emit('stepCompleted', { context, step, stepIndex: i, result: stepResult })

          // Check for conditional logic
          if (stepResult.skipToStep !== undefined) {
            i = stepResult.skipToStep - 1 // -1 because loop will increment
            continue
          }

          if (stepResult.breakExecution) {
            logger.info('Workflow execution stopped by step', { executionId: context.id, stepIndex: i })
            break
          }

        } catch (stepError) {
          logger.error('Step execution failed', { 
            executionId: context.id,
            stepIndex: i,
            stepType: step.type,
            error: stepError.message
          })

          context.errors.push({
            stepIndex: i,
            stepId: step.id,
            stepType: step.type,
            error: stepError.message,
            timestamp: new Date().toISOString()
          })

          context.stepResults.push({
            stepIndex: i,
            stepId: step.id,
            stepType: step.type,
            success: false,
            error: stepError.message,
            timestamp: new Date().toISOString()
          })

          this.emit('stepFailed', { context, step, stepIndex: i, error: stepError })

          // Handle error based on step configuration
          if (step.config?.continueOnError !== true) {
            throw stepError
          }
        }
      }

      // Execution completed successfully
      context.status = 'completed'
      context.endTime = Date.now()
      context.duration = context.endTime - context.startTime

      await this.updateExecutionStatus(context.id, 'completed', {
        completed_at: new Date().toISOString(),
        execution_data: {
          ...context.execution.execution_data,
          duration: context.duration,
          steps_completed: context.stepResults.filter(r => r.success).length,
          steps_failed: context.stepResults.filter(r => !r.success).length,
          step_results: context.stepResults,
          variables: context.variables,
          errors: context.errors
        }
      })

      logger.info('Workflow execution completed', {
        executionId: context.id,
        duration: context.duration,
        stepsCompleted: context.stepResults.filter(r => r.success).length,
        stepsFailed: context.stepResults.filter(r => !r.success).length
      })

      this.emit('executionCompleted', context)

    } catch (error) {
      // Execution failed
      context.status = 'failed'
      context.endTime = Date.now()
      context.duration = context.endTime - context.startTime

      await this.updateExecutionStatus(context.id, 'failed', {
        completed_at: new Date().toISOString(),
        error_message: error.message,
        execution_data: {
          ...context.execution.execution_data,
          duration: context.duration,
          steps_completed: context.stepResults.filter(r => r.success).length,
          steps_failed: context.stepResults.filter(r => !r.success).length,
          step_results: context.stepResults,
          variables: context.variables,
          errors: context.errors,
          failure_reason: error.message
        }
      })

      logger.error('Workflow execution failed', {
        executionId: context.id,
        error: error.message,
        duration: context.duration
      })

      this.emit('executionFailed', { context, error })

    } finally {
      // Clean up
      this.activeExecutions.delete(context.id)
      
      // Process next item in queue
      if (!this.processingQueue) {
        this.processQueue()
      }
    }
  }

  /**
   * Update execution status in database
   */
  async updateExecutionStatus(executionId, status, updates = {}) {
    try {
      const { error } = await this.supabase
        .from('workflow_executions')
        .update({
          status,
          updated_at: new Date().toISOString(),
          ...updates
        })
        .eq('id', executionId)

      if (error) {
        logger.error('Failed to update execution status', { executionId, error: error.message })
      }
    } catch (error) {
      logger.error('Error updating execution status', { executionId, error: error.message })
    }
  }

  /**
   * Start queue processor
   */
  startQueueProcessor() {
    setInterval(() => {
      if (!this.processingQueue) {
        this.processQueue()
      }
    }, 1000) // Check every second
  }

  /**
   * Process execution queue
   */
  async processQueue() {
    if (this.processingQueue || this.executionQueue.length === 0) {
      return
    }

    if (this.activeExecutions.size >= this.maxConcurrentExecutions) {
      return
    }

    this.processingQueue = true

    try {
      while (this.executionQueue.length > 0 && this.activeExecutions.size < this.maxConcurrentExecutions) {
        const context = this.executionQueue.shift()
        
        if (context) {
          // Execute without awaiting to allow concurrent execution
          this.executeWorkflow(context).catch(error => {
            logger.error('Queue execution failed', { executionId: context.id, error: error.message })
          })
        }
      }
    } finally {
      this.processingQueue = false
    }
  }

  /**
   * Cancel execution
   */
  async cancelExecution(executionId, reason = 'Cancelled by user') {
    try {
      const context = this.activeExecutions.get(executionId)
      
      if (context) {
        context.status = 'cancelled'
        this.emit('executionCancelled', { context, reason })
      }

      await this.updateExecutionStatus(executionId, 'cancelled', {
        completed_at: new Date().toISOString(),
        error_message: reason
      })

      this.activeExecutions.delete(executionId)

      logger.info('Execution cancelled', { executionId, reason })
      return true

    } catch (error) {
      logger.error('Failed to cancel execution', { executionId, error: error.message })
      return false
    }
  }

  /**
   * Get execution status
   */
  getExecutionStatus(executionId) {
    const context = this.activeExecutions.get(executionId)
    if (!context) {
      return null
    }

    return {
      id: context.id,
      status: context.status,
      currentStep: context.currentStepIndex,
      totalSteps: context.workflow.steps?.length || 0,
      duration: context.endTime ? context.endTime - context.startTime : Date.now() - context.startTime,
      stepsCompleted: context.stepResults.filter(r => r.success).length,
      stepsFailed: context.stepResults.filter(r => !r.success).length
    }
  }

  /**
   * Get all active executions
   */
  getActiveExecutions() {
    return Array.from(this.activeExecutions.values()).map(context => ({
      id: context.id,
      workflowId: context.workflowId,
      workflowName: context.workflow.name,
      userId: context.userId,
      status: context.status,
      currentStep: context.currentStepIndex,
      totalSteps: context.workflow.steps?.length || 0,
      startTime: context.startTime
    }))
  }

  /**
   * Get queue status
   */
  getQueueStatus() {
    return {
      activeExecutions: this.activeExecutions.size,
      queuedExecutions: this.executionQueue.length,
      maxConcurrent: this.maxConcurrentExecutions
    }
  }

  /**
   * Shutdown engine gracefully
   */
  async shutdown() {
    logger.info('Shutting down workflow engine', {
      activeExecutions: this.activeExecutions.size,
      queuedExecutions: this.executionQueue.length
    })

    // Cancel all active executions
    const cancelPromises = Array.from(this.activeExecutions.keys()).map(executionId => 
      this.cancelExecution(executionId, 'Server shutdown')
    )

    await Promise.all(cancelPromises)

    // Clear queue
    this.executionQueue.length = 0

    this.emit('engineShutdown')
  }
}