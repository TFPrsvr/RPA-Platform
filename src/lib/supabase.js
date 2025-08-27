import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const workflowService = {
  async getWorkflows(userId, _organizationId = null) {
    // For now, just get workflows by user_id only
    const { data, error } = await supabase
      .from('workflows')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
    
    if (error) throw error
    return data || []
  },

  async createWorkflow(workflow, userId, organizationId = null) {
    const { data, error } = await supabase
      .from('workflows')
      .insert({
        ...workflow,
        user_id: userId,
        organization_id: organizationId
      })
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async updateWorkflow(workflowId, updates, _userIdOrOrgId) {
    const { data, error } = await supabase
      .from('workflows')
      .update(updates)
      .eq('id', workflowId)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async deleteWorkflow(workflowId, organizationId) {
    const { error } = await supabase
      .from('workflows')
      .delete()
      .eq('id', workflowId)
      .eq('organization_id', organizationId)
    
    if (error) throw error
  },

  async getWorkflow(workflowId, _userIdOrOrgId) {
    const { data, error } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', workflowId)
      .single()
    
    if (error) throw error
    return data
  }
}

export const profileService = {
  async getProfile(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (error) throw error
    return data
  },

  async createProfile(profile) {
    const { data, error } = await supabase
      .from('profiles')
      .insert(profile)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async updateProfile(userId, updates) {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()
    
    if (error) throw error
    return data
  }
}

export const organizationService = {
  async createOrganization(orgData) {
    const { data, error } = await supabase
      .from('organizations')
      .insert(orgData)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async addMember(organizationId, userId, role = 'member') {
    const { data, error } = await supabase
      .from('organization_memberships')
      .insert({
        organization_id: organizationId,
        user_id: userId,
        role
      })
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async getUserOrganizations(userId) {
    const { data, error } = await supabase
      .from('organization_memberships')
      .select('*, organizations(*)')
      .eq('user_id', userId)
    
    if (error) throw error
    return data
  }
}