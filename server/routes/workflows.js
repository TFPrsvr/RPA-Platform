/**
 * 🔄 Workflow API Routes
 * RESTful API endpoints for workflow management
 */

import express from 'express'
import { createClient } from '@supabase/supabase-js'
import { AIWorkflowGenerator } from '../services/aiWorkflowGenerator.js'

const router = express.Router()

// Initialize dependencies (will be passed from main app)
let supabase, workflowEngine, workflowScheduler, aiGenerator

export function initializeRoutes(supabaseClient, engine, scheduler) {
  supabase = supabaseClient
  workflowEngine = engine
  workflowScheduler = scheduler
  aiGenerator = new AIWorkflowGenerator(supabase)
  return router
}

// Import authentication middleware
import { 
  authenticateUser, 
  validateResourceAccess, 
  paginationMiddleware,
  applyOrganizationFilter 
} from '../middleware/auth.js'

// Error handler
const handleError = (error, req, res) => {
  console.error('API Error:', error)
  
  if (error.code === 'PGRST301') {
    return res.status(404).json({ error: 'Resource not found' })
  }
  
  if (error.code === 'PGRST116') {
    return res.status(403).json({ error: 'Access denied' })
  }
  
  return res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  })
}

// ============================================================================
// WORKFLOW ENDPOINTS
// ============================================================================

/**
 * GET /api/workflows
 * Get all workflows for the authenticated user
 */
router.get('/', authenticateUser, paginationMiddleware, applyOrganizationFilter, async (req, res) => {
  try {
    const { status, search } = req.query
    const { page, limit, offset } = req.pagination
    const { user, userOrganizations } = req

    let query = supabase
      .from('workflows')
      .select(`
        id,
        name,
        description,
        status,
        created_at,
        updated_at,
        version,
        organization:organizations(name)
      `, { count: 'exact' })
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Filter by user's workflows or organization workflows
    if (userOrganizations.length > 0) {
      query = query.or(`user_id.eq.${user.id},organization_id.in.(${userOrganizations.join(',')})`)
    } else {
      query = query.eq('user_id', user.id)
    }

    // Filter by status
    if (status && ['draft', 'active', 'paused', 'archived'].includes(status)) {
      query = query.eq('status', status)
    }

    // Search by name or description
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
    }

    const { data: workflows, error, count } = await query

    if (error) {
      return handleError(error, req, res)
    }

    res.json({
      workflows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    })
  } catch (error) {
    handleError(error, req, res)
  }
})

/**
 * GET /api/workflows/:id  
 * Get a specific workflow by ID
 */
router.get('/:id', authenticateUser, validateResourceAccess('workflows'), async (req, res) => {
  try {
    const { data: workflow, error } = await supabase
      .from('workflows')
      .select(`
        *,
        organization:organizations(name, slug),
        executions:workflow_executions(id, status, created_at)
      `)
      .eq('id', req.params.id)
      .single()

    if (error) {
      return handleError(error, req, res)
    }

    res.json({ workflow })
  } catch (error) {
    handleError(error, req, res)
  }
})

/**
 * POST /api/workflows
 * Create a new workflow
 */
router.post('/', authenticateUser, async (req, res) => {
  try {
    const { name, description, steps = [], variables = {}, organization_id } = req.body

    // Validation
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ 
        error: 'Validation error', 
        message: 'Workflow name is required' 
      })
    }

    if (name.length > 100) {
      return res.status(400).json({ 
        error: 'Validation error', 
        message: 'Workflow name must be 100 characters or less' 
      })
    }

    const workflowData = {
      name: name.trim(),
      description: description?.trim() || '',
      steps,
      variables,
      user_id: req.user.id,
      status: 'draft'
    }

    // Add organization if provided
    if (organization_id) {
      workflowData.organization_id = organization_id
    }

    const { data: workflow, error } = await supabase
      .from('workflows')
      .insert([workflowData])
      .select()
      .single()

    if (error) {
      return handleError(error, req, res)
    }

    res.status(201).json({ workflow })
  } catch (error) {
    handleError(error, req, res)
  }
})

/**
 * PUT /api/workflows/:id
 * Update a workflow
 */
router.put('/:id', authenticateUser, validateResourceAccess('workflows'), async (req, res) => {
  try {
    const { name, description, steps, variables, status } = req.body

    const updates = {
      updated_at: new Date().toISOString()
    }

    // Only update provided fields
    if (name !== undefined) {
      if (!name || name.trim().length === 0) {
        return res.status(400).json({ 
          error: 'Validation error', 
          message: 'Workflow name cannot be empty' 
        })
      }
      updates.name = name.trim()
    }

    if (description !== undefined) {
      updates.description = description?.trim() || ''
    }

    if (steps !== undefined) {
      updates.steps = steps
    }

    if (variables !== undefined) {
      updates.variables = variables
    }

    if (status !== undefined) {
      if (!['draft', 'active', 'paused', 'archived'].includes(status)) {
        return res.status(400).json({ 
          error: 'Validation error', 
          message: 'Invalid status value' 
        })
      }
      updates.status = status
    }

    const { data: workflow, error } = await supabase
      .from('workflows')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single()

    if (error) {
      return handleError(error, req, res)
    }

    res.json({ workflow })
  } catch (error) {
    handleError(error, req, res)
  }
})

/**
 * DELETE /api/workflows/:id
 * Delete a workflow
 */
router.delete('/:id', authenticateUser, validateResourceAccess('workflows'), async (req, res) => {
  try {
    const { error } = await supabase
      .from('workflows')
      .delete()
      .eq('id', req.params.id)

    if (error) {
      return handleError(error, req, res)
    }

    res.status(204).send()
  } catch (error) {
    handleError(error, req, res)
  }
})

/**
 * POST /api/workflows/generate-ai
 * Generate a workflow using AI from natural language description
 */
router.post('/generate-ai', authenticateUser, async (req, res) => {
  try {
    const { description, options = {} } = req.body

    // Validation
    if (!description || description.trim().length === 0) {
      return res.status(400).json({ 
        error: 'Validation error', 
        message: 'Description is required for AI workflow generation' 
      })
    }

    if (description.length > 2000) {
      return res.status(400).json({ 
        error: 'Validation error', 
        message: 'Description must be 2000 characters or less' 
      })
    }

    // Generate workflow using AI
    const result = await aiGenerator.generateWorkflow(
      description, 
      req.user.id, 
      {
        ...options,
        organizationId: req.user.currentOrgId || req.user.activeOrgId
      }
    )

    res.json({
      workflow: result.workflow,
      analysis: result.analysis,
      suggestions: result.suggestions,
      message: 'Workflow generated successfully using AI'
    })

  } catch (error) {
    handleError(error, req, res)
  }
})

/**
 * POST /api/workflows/:id/duplicate
 * Duplicate a workflow
 */
router.post('/:id/duplicate', authenticateUser, validateResourceAccess('workflows'), async (req, res) => {
  try {
    // Use the resource data from validateResourceAccess middleware
    const original = req.resource

    // Get full workflow data
    const { data: workflowData, error: fetchError } = await supabase
      .from('workflows')
      .select('name, description, steps, variables, organization_id')
      .eq('id', req.params.id)
      .single()

    if (fetchError) {
      return handleError(fetchError, req, res)
    }

    // Create duplicate with modified name
    const duplicateData = {
      ...workflowData,
      name: `${workflowData.name} (Copy)`,
      user_id: req.user.id,
      status: 'draft'
    }

    const { data: workflow, error } = await supabase
      .from('workflows')
      .insert([duplicateData])
      .select()
      .single()

    if (error) {
      return handleError(error, req, res)
    }

    res.status(201).json({ workflow })
  } catch (error) {
    handleError(error, req, res)
  }
})

// ============================================================================
// WORKFLOW EXECUTION ENDPOINTS
// ============================================================================

/**
 * POST /api/workflows/:id/execute
 * Start workflow execution
 */
router.post('/:id/execute', authenticateUser, validateResourceAccess('workflows'), async (req, res) => {
  try {
    // Use workflow data from validateResourceAccess middleware
    const workflow = req.resource

    // Get full workflow details if needed
    const { data: workflowDetails, error: workflowError } = await supabase
      .from('workflows')
      .select('id, name, steps, status, organization_id')
      .eq('id', req.params.id)
      .single()

    if (workflowError) {
      return handleError(workflowError, req, res)
    }

    if (workflowDetails.status !== 'active') {
      return res.status(400).json({
        error: 'Workflow not executable',
        message: 'Only active workflows can be executed'
      })
    }

    // Execute workflow using the workflow engine
    const execution = await workflowEngine.execute(
      req.params.id,
      req.user.id,
      workflowDetails.organization_id,
      {
        trigger: 'manual',
        triggeredBy: req.user.id,
        variables: req.body.variables || {}
      }
    )

    res.status(201).json({ 
      execution,
      message: 'Workflow execution started',
      status: 'pending'
    })
  } catch (error) {
    handleError(error, req, res)
  }
})

/**
 * GET /api/workflows/:id/executions
 * Get execution history for a workflow
 */
router.get('/:id/executions', authenticateUser, validateResourceAccess('workflows'), paginationMiddleware, async (req, res) => {
  try {
    const { page, limit, offset } = req.pagination

    const { data: executions, error, count } = await supabase
      .from('workflow_executions')
      .select(`
        id,
        status,
        started_at,
        completed_at,
        error_message,
        created_at
      `, { count: 'exact' })
      .eq('workflow_id', req.params.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      return handleError(error, req, res)
    }

    res.json({
      executions,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit)
      }
    })
  } catch (error) {
    handleError(error, req, res)
  }
})

// ============================================================================
// WORKFLOW SCHEDULING ENDPOINTS  
// ============================================================================

/**
 * POST /api/workflows/:id/schedule
 * Schedule a workflow for automatic execution
 */
router.post('/:id/schedule', authenticateUser, validateResourceAccess('workflows'), async (req, res) => {
  try {
    const { scheduleConfig } = req.body

    if (!scheduleConfig) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Schedule configuration is required'
      })
    }

    // Schedule the workflow
    await workflowScheduler.scheduleWorkflow(
      req.params.id,
      scheduleConfig,
      req.user.id,
      req.resource.organization_id
    )

    res.json({
      message: 'Workflow scheduled successfully',
      scheduleConfig
    })

  } catch (error) {
    handleError(error, req, res)
  }
})

/**
 * DELETE /api/workflows/:id/schedule
 * Remove workflow schedule
 */
router.delete('/:id/schedule', authenticateUser, validateResourceAccess('workflows'), async (req, res) => {
  try {
    await workflowScheduler.unscheduleWorkflow(req.params.id)

    res.json({
      message: 'Workflow schedule removed successfully'
    })

  } catch (error) {
    handleError(error, req, res)
  }
})

/**
 * POST /api/workflows/:id/cancel
 * Cancel a running workflow execution
 */
router.post('/:id/cancel', authenticateUser, validateResourceAccess('workflows'), async (req, res) => {
  try {
    const { executionId } = req.body

    if (!executionId) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Execution ID is required'
      })
    }

    // Cancel the execution
    const success = await workflowEngine.cancelExecution(executionId, 'Cancelled by user')

    if (!success) {
      return res.status(404).json({
        error: 'Execution not found',
        message: 'The specified execution could not be cancelled'
      })
    }

    res.json({
      message: 'Workflow execution cancelled successfully'
    })

  } catch (error) {
    handleError(error, req, res)
  }
})

/**
 * GET /api/workflows/:id/status
 * Get real-time workflow execution status
 */
router.get('/:id/status', authenticateUser, validateResourceAccess('workflows'), async (req, res) => {
  try {
    const { executionId } = req.query

    if (executionId) {
      // Get specific execution status
      const status = workflowEngine.getExecutionStatus(executionId)
      
      if (!status) {
        return res.status(404).json({
          error: 'Execution not found',
          message: 'The specified execution is not currently running'
        })
      }

      res.json({ executionStatus: status })
    } else {
      // Get all executions for this workflow
      const activeExecutions = workflowEngine.getActiveExecutions()
      const workflowExecutions = activeExecutions.filter(exec => exec.workflowId === req.params.id)

      res.json({ 
        activeExecutions: workflowExecutions,
        count: workflowExecutions.length
      })
    }

  } catch (error) {
    handleError(error, req, res)
  }
})

// ============================================================================
// WORKFLOW ENGINE STATUS ENDPOINTS
// ============================================================================

/**
 * GET /api/workflows/engine/status
 * Get workflow engine status and queue information
 */
router.get('/engine/status', authenticateUser, async (req, res) => {
  try {
    const queueStatus = workflowEngine.getQueueStatus()
    const activeExecutions = workflowEngine.getActiveExecutions()
    const schedulerStatus = workflowScheduler.getStatus()

    res.json({
      engine: queueStatus,
      scheduler: schedulerStatus,
      activeExecutions: activeExecutions.filter(exec => 
        exec.userId === req.user.id || 
        req.userOrganizations?.includes(exec.organizationId)
      )
    })

  } catch (error) {
    handleError(error, req, res)
  }
})

export default router