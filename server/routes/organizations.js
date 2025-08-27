/**
 * 🏢 Organization API Routes
 * Multi-tenant organization management endpoints
 */

import express from 'express'

const router = express.Router()

let supabase

export function initializeRoutes(supabaseClient) {
  supabase = supabaseClient
  return router
}

// Import authentication middleware
import { 
  authenticateUser, 
  requireOrganizationRole,
  validateResourceAccess,
  paginationMiddleware 
} from '../middleware/auth.js'

// Error handler
const handleError = (error, req, res) => {
  console.error('Organization API Error:', error)
  
  if (error.code === 'PGRST301') {
    return res.status(404).json({ error: 'Organization not found' })
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
// ORGANIZATION ENDPOINTS
// ============================================================================

/**
 * GET /api/organizations
 * Get all organizations for the authenticated user
 */
router.get('/', authenticateUser, async (req, res) => {
  try {
    const { data: memberships, error } = await supabase
      .from('organization_memberships')
      .select(`
        role,
        created_at,
        organization:organizations (
          id,
          clerk_org_id,
          name,
          slug,
          description,
          logo_url,
          branding_config,
          created_at
        )
      `)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })

    if (error) {
      return handleError(error, req, res)
    }

    // Transform the data to be more user-friendly
    const organizations = memberships.map(membership => ({
      ...membership.organization,
      user_role: membership.role,
      joined_at: membership.created_at
    }))

    res.json({ organizations })
  } catch (error) {
    handleError(error, req, res)
  }
})

/**
 * GET /api/organizations/:id
 * Get a specific organization by ID
 */
router.get('/:id', authenticateUser, validateResourceAccess('organizations'), async (req, res) => {
  try {
    // Access already validated by validateResourceAccess middleware
    const { data: membership, error: membershipError } = await supabase
      .from('organization_memberships')
      .select('role')
      .eq('organization_id', req.params.id)
      .eq('user_id', req.user.id)
      .single()

    if (membershipError) {
      return res.status(403).json({ 
        error: 'Access denied', 
        message: 'You do not belong to this organization' 
      })
    }

    // Get organization details
    const { data: organization, error } = await supabase
      .from('organizations')
      .select(`
        *,
        members:organization_memberships (
          id,
          role,
          created_at,
          user:profiles (
            id,
            clerk_user_id,
            email,
            first_name,
            last_name,
            image_url
          )
        )
      `)
      .eq('id', req.params.id)
      .single()

    if (error) {
      return handleError(error, req, res)
    }

    // Add user's role to the response
    organization.user_role = membership.role

    res.json({ organization })
  } catch (error) {
    handleError(error, req, res)
  }
})

/**
 * POST /api/organizations
 * Create a new organization (typically done via Clerk webhooks)
 */
router.post('/', authenticateUser, async (req, res) => {
  try {
    const { clerk_org_id, name, slug, description, logo_url, branding_config } = req.body

    // Validation
    if (!clerk_org_id || !name || !slug) {
      return res.status(400).json({ 
        error: 'Validation error', 
        message: 'clerk_org_id, name, and slug are required' 
      })
    }

    // Create organization
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .insert([{
        clerk_org_id,
        name: name.trim(),
        slug: slug.trim().toLowerCase(),
        description: description?.trim() || '',
        logo_url,
        branding_config: branding_config || {}
      }])
      .select()
      .single()

    if (orgError) {
      return handleError(orgError, req, res)
    }

    // Add user as admin of the new organization
    const { error: membershipError } = await supabase
      .from('organization_memberships')
      .insert([{
        organization_id: organization.id,
        user_id: req.user.id,
        role: 'admin'
      }])

    if (membershipError) {
      // If membership creation fails, clean up the organization
      await supabase.from('organizations').delete().eq('id', organization.id)
      return handleError(membershipError, req, res)
    }

    res.status(201).json({ organization })
  } catch (error) {
    handleError(error, req, res)
  }
})

/**
 * PUT /api/organizations/:id
 * Update an organization (admin only)
 */
router.put('/:id', authenticateUser, requireOrganizationRole(['admin']), async (req, res) => {
  try {
    // Role already validated by requireOrganizationRole middleware

    const { name, description, logo_url, branding_config } = req.body

    const updates = {
      updated_at: new Date().toISOString()
    }

    if (name !== undefined) {
      if (!name || name.trim().length === 0) {
        return res.status(400).json({ 
          error: 'Validation error', 
          message: 'Organization name cannot be empty' 
        })
      }
      updates.name = name.trim()
    }

    if (description !== undefined) {
      updates.description = description?.trim() || ''
    }

    if (logo_url !== undefined) {
      updates.logo_url = logo_url
    }

    if (branding_config !== undefined) {
      updates.branding_config = branding_config
    }

    const { data: organization, error } = await supabase
      .from('organizations')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single()

    if (error) {
      return handleError(error, req, res)
    }

    res.json({ organization })
  } catch (error) {
    handleError(error, req, res)
  }
})

// ============================================================================
// ORGANIZATION MEMBER ENDPOINTS
// ============================================================================

/**
 * POST /api/organizations/:id/members
 * Add a member to organization (admin only)
 */
router.post('/:id/members', authenticateUser, requireOrganizationRole(['admin']), async (req, res) => {
  try {
    // Role already validated by requireOrganizationRole middleware

    const { user_id, role = 'member' } = req.body

    if (!user_id) {
      return res.status(400).json({ 
        error: 'Validation error', 
        message: 'user_id is required' 
      })
    }

    if (!['admin', 'member', 'viewer'].includes(role)) {
      return res.status(400).json({ 
        error: 'Validation error', 
        message: 'Invalid role. Must be admin, member, or viewer' 
      })
    }

    const { data: newMembership, error } = await supabase
      .from('organization_memberships')
      .insert([{
        organization_id: req.params.id,
        user_id,
        role
      }])
      .select(`
        id,
        role,
        created_at,
        user:profiles (
          id,
          clerk_user_id,
          email,
          first_name,
          last_name,
          image_url
        )
      `)
      .single()

    if (error) {
      return handleError(error, req, res)
    }

    res.status(201).json({ membership: newMembership })
  } catch (error) {
    handleError(error, req, res)
  }
})

/**
 * PUT /api/organizations/:id/members/:userId
 * Update member role (admin only)
 */
router.put('/:id/members/:userId', authenticateUser, requireOrganizationRole(['admin']), async (req, res) => {
  try {
    // Role already validated by requireOrganizationRole middleware

    const { role } = req.body

    if (!role || !['admin', 'member', 'viewer'].includes(role)) {
      return res.status(400).json({ 
        error: 'Validation error', 
        message: 'Invalid role. Must be admin, member, or viewer' 
      })
    }

    const { data: updatedMembership, error } = await supabase
      .from('organization_memberships')
      .update({ role })
      .eq('organization_id', req.params.id)
      .eq('user_id', req.params.userId)
      .select(`
        id,
        role,
        created_at,
        user:profiles (
          id,
          clerk_user_id,
          email,
          first_name,
          last_name,
          image_url
        )
      `)
      .single()

    if (error) {
      return handleError(error, req, res)
    }

    res.json({ membership: updatedMembership })
  } catch (error) {
    handleError(error, req, res)
  }
})

/**
 * DELETE /api/organizations/:id/members/:userId
 * Remove member from organization (admin only)
 */
router.delete('/:id/members/:userId', authenticateUser, async (req, res) => {
  try {
    // Check if user is admin (or removing themselves)
    const { data: membership, error: membershipError } = await supabase
      .from('organization_memberships')
      .select('role')
      .eq('organization_id', req.params.id)
      .eq('user_id', req.user.id)
      .single()

    const isSelfRemoval = req.params.userId === req.user.id
    const isAdmin = membership && membership.role === 'admin'

    if (membershipError || (!isSelfRemoval && !isAdmin)) {
      return res.status(403).json({ 
        error: 'Access denied', 
        message: 'Admin role required to remove members or you can only remove yourself' 
      })
    }

    const { error } = await supabase
      .from('organization_memberships')
      .delete()
      .eq('organization_id', req.params.id)
      .eq('user_id', req.params.userId)

    if (error) {
      return handleError(error, req, res)
    }

    res.status(204).send()
  } catch (error) {
    handleError(error, req, res)
  }
})

export default router