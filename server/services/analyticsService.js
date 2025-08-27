/**
 * 📊 Analytics & Monitoring Service
 * Comprehensive workflow execution analytics and performance monitoring
 */

import { logger } from '../middleware/errorHandler.js'

export class AnalyticsService {
  constructor(supabase) {
    this.supabase = supabase
    this.metrics = new Map()
    this.startTime = Date.now()
  }

  /**
   * Record workflow execution metrics
   */
  async recordExecution(executionData) {
    try {
      const {
        executionId,
        workflowId,
        userId,
        organizationId,
        status,
        startTime,
        endTime,
        duration,
        stepResults,
        errors
      } = executionData

      const metrics = {
        execution_id: executionId,
        workflow_id: workflowId,
        user_id: userId,
        organization_id: organizationId,
        status,
        started_at: startTime,
        completed_at: endTime,
        duration_ms: duration,
        total_steps: stepResults?.length || 0,
        successful_steps: stepResults?.filter(s => s.success).length || 0,
        failed_steps: stepResults?.filter(s => !s.success).length || 0,
        error_count: errors?.length || 0,
        created_at: new Date().toISOString()
      }

      // Store detailed step metrics
      if (stepResults?.length > 0) {
        const stepMetrics = stepResults.map((step, index) => ({
          execution_id: executionId,
          step_index: index,
          step_id: step.stepId,
          step_type: step.stepType,
          success: step.success,
          duration_ms: step.executionTime || 0,
          error_message: step.error || null,
          created_at: new Date().toISOString()
        }))

        await this.supabase
          .from('execution_step_metrics')
          .insert(stepMetrics)
      }

      // Store main execution metrics
      await this.supabase
        .from('execution_metrics')
        .insert([metrics])

      logger.debug('Execution metrics recorded', { executionId, workflowId })

    } catch (error) {
      logger.error('Error recording execution metrics', { error: error.message })
    }
  }

  /**
   * Get workflow performance analytics
   */
  async getWorkflowAnalytics(workflowId, timeRange = '30d') {
    try {
      const dateFilter = this.getDateFilter(timeRange)

      // Basic execution statistics
      const { data: executions, error: execError } = await this.supabase
        .from('execution_metrics')
        .select('*')
        .eq('workflow_id', workflowId)
        .gte('created_at', dateFilter)

      if (execError) throw execError

      // Success rate analysis
      const totalExecutions = executions.length
      const successfulExecutions = executions.filter(e => e.status === 'completed').length
      const failedExecutions = executions.filter(e => e.status === 'failed').length
      const cancelledExecutions = executions.filter(e => e.status === 'cancelled').length

      const successRate = totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0

      // Performance metrics
      const completedExecutions = executions.filter(e => e.duration_ms)
      const avgDuration = completedExecutions.length > 0 ? 
        completedExecutions.reduce((sum, e) => sum + e.duration_ms, 0) / completedExecutions.length : 0

      const minDuration = completedExecutions.length > 0 ? 
        Math.min(...completedExecutions.map(e => e.duration_ms)) : 0

      const maxDuration = completedExecutions.length > 0 ? 
        Math.max(...completedExecutions.map(e => e.duration_ms)) : 0

      // Execution trend (daily)
      const executionTrend = this.calculateExecutionTrend(executions)

      // Most common errors
      const errorAnalysis = await this.getErrorAnalysis(workflowId, timeRange)

      // Step performance
      const stepPerformance = await this.getStepPerformance(workflowId, timeRange)

      return {
        summary: {
          totalExecutions,
          successfulExecutions,
          failedExecutions,
          cancelledExecutions,
          successRate: Math.round(successRate * 100) / 100,
          avgDuration: Math.round(avgDuration),
          minDuration,
          maxDuration
        },
        trend: executionTrend,
        errors: errorAnalysis,
        stepPerformance,
        timeRange
      }

    } catch (error) {
      logger.error('Error getting workflow analytics', { workflowId, error: error.message })
      throw error
    }
  }

  /**
   * Get user analytics dashboard data
   */
  async getUserAnalytics(userId, timeRange = '30d') {
    try {
      const dateFilter = this.getDateFilter(timeRange)

      // User's workflow executions
      const { data: executions, error: execError } = await this.supabase
        .from('execution_metrics')
        .select(`
          *,
          workflow:workflows(name, category)
        `)
        .eq('user_id', userId)
        .gte('created_at', dateFilter)

      if (execError) throw execError

      // Workflow usage statistics
      const workflowUsage = executions.reduce((acc, exec) => {
        const workflowId = exec.workflow_id
        if (!acc[workflowId]) {
          acc[workflowId] = {
            workflowId,
            name: exec.workflow?.name || 'Unknown',
            executions: 0,
            successful: 0,
            failed: 0,
            totalDuration: 0
          }
        }
        
        acc[workflowId].executions++
        if (exec.status === 'completed') acc[workflowId].successful++
        if (exec.status === 'failed') acc[workflowId].failed++
        if (exec.duration_ms) acc[workflowId].totalDuration += exec.duration_ms

        return acc
      }, {})

      // Convert to array and sort by usage
      const topWorkflows = Object.values(workflowUsage)
        .sort((a, b) => b.executions - a.executions)
        .slice(0, 10)

      // Activity heatmap (hourly)
      const activityHeatmap = this.calculateActivityHeatmap(executions)

      // Time saved calculation
      const timeSaved = this.calculateTimeSaved(executions)

      return {
        summary: {
          totalExecutions: executions.length,
          successfulExecutions: executions.filter(e => e.status === 'completed').length,
          failedExecutions: executions.filter(e => e.status === 'failed').length,
          totalWorkflows: Object.keys(workflowUsage).length,
          timeSaved
        },
        topWorkflows,
        activityHeatmap,
        timeRange
      }

    } catch (error) {
      logger.error('Error getting user analytics', { userId, error: error.message })
      throw error
    }
  }

  /**
   * Get organization analytics
   */
  async getOrganizationAnalytics(organizationId, timeRange = '30d') {
    try {
      const dateFilter = this.getDateFilter(timeRange)

      // Organization executions
      const { data: executions, error: execError } = await this.supabase
        .from('execution_metrics')
        .select(`
          *,
          workflow:workflows(name, category),
          user:profiles(email, first_name, last_name)
        `)
        .eq('organization_id', organizationId)
        .gte('created_at', dateFilter)

      if (execError) throw execError

      // User activity statistics
      const userActivity = executions.reduce((acc, exec) => {
        const userId = exec.user_id
        if (!acc[userId]) {
          acc[userId] = {
            userId,
            name: `${exec.user?.first_name || ''} ${exec.user?.last_name || ''}`.trim() || exec.user?.email || 'Unknown',
            executions: 0,
            successful: 0,
            failed: 0,
            totalDuration: 0
          }
        }
        
        acc[userId].executions++
        if (exec.status === 'completed') acc[userId].successful++
        if (exec.status === 'failed') acc[userId].failed++
        if (exec.duration_ms) acc[userId].totalDuration += exec.duration_ms

        return acc
      }, {})

      // Workflow category analysis
      const categoryUsage = executions.reduce((acc, exec) => {
        const category = exec.workflow?.category || 'Uncategorized'
        if (!acc[category]) {
          acc[category] = {
            category,
            executions: 0,
            workflows: new Set()
          }
        }
        
        acc[category].executions++
        acc[category].workflows.add(exec.workflow_id)

        return acc
      }, {})

      Object.keys(categoryUsage).forEach(category => {
        categoryUsage[category].workflows = categoryUsage[category].workflows.size
      })

      return {
        summary: {
          totalExecutions: executions.length,
          successfulExecutions: executions.filter(e => e.status === 'completed').length,
          failedExecutions: executions.filter(e => e.status === 'failed').length,
          totalUsers: Object.keys(userActivity).length,
          totalWorkflows: new Set(executions.map(e => e.workflow_id)).size
        },
        userActivity: Object.values(userActivity).sort((a, b) => b.executions - a.executions),
        categoryUsage: Object.values(categoryUsage).sort((a, b) => b.executions - a.executions),
        timeRange
      }

    } catch (error) {
      logger.error('Error getting organization analytics', { organizationId, error: error.message })
      throw error
    }
  }

  /**
   * Get real-time system metrics
   */
  getSystemMetrics() {
    const uptime = Date.now() - this.startTime

    return {
      uptime: uptime,
      uptimeFormatted: this.formatDuration(uptime),
      timestamp: new Date().toISOString(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage()
    }
  }

  /**
   * Get error analysis for a workflow
   */
  async getErrorAnalysis(workflowId, timeRange = '30d') {
    try {
      const dateFilter = this.getDateFilter(timeRange)

      const { data: stepMetrics, error } = await this.supabase
        .from('execution_step_metrics')
        .select('step_type, error_message')
        .eq('workflow_id', workflowId)
        .eq('success', false)
        .not('error_message', 'is', null)
        .gte('created_at', dateFilter)

      if (error) throw error

      // Group errors by type and message
      const errorGroups = stepMetrics.reduce((acc, step) => {
        const key = `${step.step_type}:${step.error_message}`
        if (!acc[key]) {
          acc[key] = {
            stepType: step.step_type,
            errorMessage: step.error_message,
            count: 0
          }
        }
        acc[key].count++
        return acc
      }, {})

      return Object.values(errorGroups)
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)

    } catch (error) {
      logger.error('Error getting error analysis', { workflowId, error: error.message })
      return []
    }
  }

  /**
   * Get step performance analysis
   */
  async getStepPerformance(workflowId, timeRange = '30d') {
    try {
      const dateFilter = this.getDateFilter(timeRange)

      const { data: stepMetrics, error } = await this.supabase
        .from('execution_step_metrics')
        .select('step_type, success, duration_ms')
        .eq('workflow_id', workflowId)
        .gte('created_at', dateFilter)

      if (error) throw error

      // Analyze performance by step type
      const stepAnalysis = stepMetrics.reduce((acc, step) => {
        if (!acc[step.step_type]) {
          acc[step.step_type] = {
            stepType: step.step_type,
            totalRuns: 0,
            successfulRuns: 0,
            failedRuns: 0,
            totalDuration: 0,
            avgDuration: 0,
            minDuration: Infinity,
            maxDuration: 0
          }
        }

        const analysis = acc[step.step_type]
        analysis.totalRuns++
        
        if (step.success) {
          analysis.successfulRuns++
        } else {
          analysis.failedRuns++
        }

        if (step.duration_ms) {
          analysis.totalDuration += step.duration_ms
          analysis.minDuration = Math.min(analysis.minDuration, step.duration_ms)
          analysis.maxDuration = Math.max(analysis.maxDuration, step.duration_ms)
        }

        return acc
      }, {})

      // Calculate averages and success rates
      Object.values(stepAnalysis).forEach(analysis => {
        if (analysis.totalRuns > 0) {
          analysis.successRate = (analysis.successfulRuns / analysis.totalRuns) * 100
          analysis.avgDuration = analysis.totalDuration / analysis.totalRuns
        }
        if (analysis.minDuration === Infinity) {
          analysis.minDuration = 0
        }
      })

      return Object.values(stepAnalysis)
        .sort((a, b) => b.totalRuns - a.totalRuns)

    } catch (error) {
      logger.error('Error getting step performance', { workflowId, error: error.message })
      return []
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Get date filter for time range
   */
  getDateFilter(timeRange) {
    const now = new Date()
    let daysBack = 30

    switch (timeRange) {
      case '7d': daysBack = 7; break
      case '30d': daysBack = 30; break
      case '90d': daysBack = 90; break
      case '1y': daysBack = 365; break
    }

    return new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000).toISOString()
  }

  /**
   * Calculate execution trend over time
   */
  calculateExecutionTrend(executions) {
    const dailyStats = {}

    executions.forEach(exec => {
      const date = new Date(exec.created_at).toISOString().split('T')[0]
      if (!dailyStats[date]) {
        dailyStats[date] = {
          date,
          total: 0,
          successful: 0,
          failed: 0,
          cancelled: 0
        }
      }

      dailyStats[date].total++
      dailyStats[date][exec.status]++
    })

    return Object.values(dailyStats).sort((a, b) => a.date.localeCompare(b.date))
  }

  /**
   * Calculate activity heatmap (hour of day analysis)
   */
  calculateActivityHeatmap(executions) {
    const hourlyActivity = new Array(24).fill(0)

    executions.forEach(exec => {
      const hour = new Date(exec.created_at).getHours()
      hourlyActivity[hour]++
    })

    return hourlyActivity.map((count, hour) => ({
      hour,
      count,
      percentage: executions.length > 0 ? (count / executions.length) * 100 : 0
    }))
  }

  /**
   * Calculate estimated time saved through automation
   */
  calculateTimeSaved(executions) {
    // Assume each successful execution saves 10 minutes of manual work
    const manualTimePerTask = 10 * 60 * 1000 // 10 minutes in milliseconds
    const successfulExecutions = executions.filter(e => e.status === 'completed').length
    const actualTimeSpent = executions
      .filter(e => e.duration_ms)
      .reduce((sum, e) => sum + e.duration_ms, 0)

    const estimatedManualTime = successfulExecutions * manualTimePerTask
    const timeSaved = estimatedManualTime - actualTimeSpent

    return {
      estimatedManualTimeMs: estimatedManualTime,
      actualAutomationTimeMs: actualTimeSpent,
      timeSavedMs: Math.max(0, timeSaved),
      timeSavedFormatted: this.formatDuration(Math.max(0, timeSaved)),
      efficiency: estimatedManualTime > 0 ? ((timeSaved / estimatedManualTime) * 100) : 0
    }
  }

  /**
   * Format duration in a human-readable way
   */
  formatDuration(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m`
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    } else {
      return `${seconds}s`
    }
  }

  /**
   * Generate performance report
   */
  async generatePerformanceReport(userId, organizationId = null, timeRange = '30d') {
    try {
      const [userAnalytics, orgAnalytics] = await Promise.all([
        this.getUserAnalytics(userId, timeRange),
        organizationId ? this.getOrganizationAnalytics(organizationId, timeRange) : null
      ])

      const report = {
        user: userAnalytics,
        organization: orgAnalytics,
        system: this.getSystemMetrics(),
        generatedAt: new Date().toISOString(),
        timeRange
      }

      // Store report for future reference
      await this.supabase
        .from('performance_reports')
        .insert([{
          user_id: userId,
          organization_id: organizationId,
          report_data: report,
          time_range: timeRange,
          created_at: new Date().toISOString()
        }])

      return report

    } catch (error) {
      logger.error('Error generating performance report', { 
        userId, 
        organizationId, 
        error: error.message 
      })
      throw error
    }
  }
}