/**
 * 🔐 Authentication & Authorization Middleware
 * Multi-tenant access control and user context management
 */

import { createClient } from '@supabase/supabase-js'
import { logger } from './errorHandler.js'

// Initialize Supabase client for auth operations
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

/**
 * Extract and validate user ID from request headers
 * In production, this would verify JWT tokens from Clerk
 */
export const authenticateUser = async (req, res, next) => {
  try {
    const userId = req.headers['x-user-id']
    const orgId = req.headers['x-organization-id']
    
    if (!userId) {
      return res.status(401).json({ 
        error: 'Authentication required', 
        message: 'User ID must be provided in x-user-id header' 
      })
    }

    // Verify user exists in our database
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, clerk_user_id, active_organization_id')
      .eq('clerk_user_id', userId)
      .single()

    if (profileError || !profile) {
      logger.warn('User not found in database', { userId, error: profileError })
      return res.status(401).json({
        error: 'User not found',
        message: 'Please complete your profile setup'
      })
    }

    // Add user context to request
    req.user = {
      id: profile.id,
      clerkId: profile.clerk_user_id,
      activeOrgId: profile.active_organization_id
    }

    // If organization ID is provided, validate access
    if (orgId) {
      const hasAccess = await validateOrganizationAccess(profile.id, orgId)
      if (!hasAccess) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You do not have access to this organization'
        })
      }
      req.user.currentOrgId = orgId
    }

    logger.debug('User authenticated', { 
      userId: profile.id, 
      clerkId: userId,
      organizationId: orgId 
    })

    next()
  } catch (error) {
    logger.error('Authentication error', { error: error.message, userId: req.headers['x-user-id'] })
    res.status(500).json({
      error: 'Authentication failed',
      message: 'Internal authentication error'
    })
  }
}

/**
 * Validate that a user has access to a specific organization
 */
export const validateOrganizationAccess = async (userId, organizationId) => {
  try {
    const { data: membership, error } = await supabase
      .from('organization_memberships')
      .select('id, role')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .single()

    return !error && membership
  } catch (error) {
    logger.error('Organization access validation error', { error: error.message, userId, organizationId })
    return false
  }
}

/**
 * Require specific organization role
 */
export const requireOrganizationRole = (requiredRoles = []) => {
  return async (req, res, next) => {
    try {
      const { user } = req
      const organizationId = req.params.id || req.user.currentOrgId

      if (!organizationId) {
        return res.status(400).json({
          error: 'Organization required',
          message: 'Organization ID must be specified'
        })
      }

      const { data: membership, error } = await supabase
        .from('organization_memberships')
        .select('role')
        .eq('user_id', user.id)
        .eq('organization_id', organizationId)
        .single()

      if (error || !membership) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You do not belong to this organization'
        })
      }

      if (requiredRoles.length > 0 && !requiredRoles.includes(membership.role)) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          message: `Required role: ${requiredRoles.join(' or ')}, your role: ${membership.role}`
        })
      }

      req.user.organizationRole = membership.role
      next()
    } catch (error) {
      logger.error('Organization role validation error', { error: error.message })
      res.status(500).json({
        error: 'Authorization failed',
        message: 'Internal authorization error'
      })
    }
  }
}

/**
 * Apply Row Level Security context for Supabase queries
 * This sets the user context for RLS policies
 */
export const applyRLSContext = (supabaseClient) => {
  return (req, res, next) => {
    if (req.user) {
      // Set user context for RLS
      req.supabase = supabaseClient.rpc('set_user_context', {
        user_id: req.user.id,
        organization_id: req.user.currentOrgId || req.user.activeOrgId
      })
    }
    next()
  }
}

/**
 * Ensure user has access to the requested resource
 * Validates that workflow/execution belongs to user or their organization
 */
export const validateResourceAccess = (resourceTable, resourceIdParam = 'id') => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[resourceIdParam]
      const { user } = req

      if (!resourceId) {
        return res.status(400).json({
          error: 'Resource ID required',
          message: `${resourceIdParam} parameter is required`
        })
      }

      let query = supabase
        .from(resourceTable)
        .select('id, user_id, organization_id')
        .eq('id', resourceId)

      const { data: resource, error } = await query.single()

      if (error) {
        if (error.code === 'PGRST301') {
          return res.status(404).json({
            error: 'Resource not found',
            message: `${resourceTable} not found`
          })
        }
        throw error
      }

      // Check if user owns the resource
      const userOwnsResource = resource.user_id === user.id

      // Check if resource belongs to user's organization
      const resourceInUserOrg = resource.organization_id && 
        (resource.organization_id === user.currentOrgId || 
         resource.organization_id === user.activeOrgId)

      if (!userOwnsResource && !resourceInUserOrg) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You do not have access to this resource'
        })
      }

      req.resource = resource
      next()
    } catch (error) {
      logger.error('Resource access validation error', { error: error.message })
      res.status(500).json({
        error: 'Access validation failed',
        message: 'Internal access validation error'
      })
    }
  }
}

/**
 * Paginate results with proper limits
 */
export const paginationMiddleware = (req, res, next) => {
  const page = Math.max(1, parseInt(req.query.page) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10))
  const offset = (page - 1) * limit

  req.pagination = { page, limit, offset }
  next()
}

/**
 * Apply organization filter to Supabase queries
 * Automatically filters results by user's accessible organizations
 */
export const applyOrganizationFilter = async (req, res, next) => {
  try {
    const { user } = req

    // Get user's organizations
    const { data: memberships, error } = await supabase
      .from('organization_memberships')
      .select('organization_id')
      .eq('user_id', user.id)

    if (error) {
      logger.error('Failed to get user organizations', { error: error.message, userId: user.id })
      req.userOrganizations = []
    } else {
      req.userOrganizations = memberships.map(m => m.organization_id)
    }

    next()
  } catch (error) {
    logger.error('Organization filter error', { error: error.message })
    res.status(500).json({
      error: 'Organization filter failed',
      message: 'Internal organization filter error'
    })
  }
}