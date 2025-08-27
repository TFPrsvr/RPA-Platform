/**
 * 📋 Workflow Template Service
 * Manages workflow templates and template marketplace
 */

import { logger } from '../middleware/errorHandler.js'

export class TemplateService {
  constructor(supabase) {
    this.supabase = supabase
    this.builtInTemplates = this.loadBuiltInTemplates()
  }

  /**
   * Load built-in workflow templates
   */
  loadBuiltInTemplates() {
    return {
      'web-scraping-basic': {
        id: 'web-scraping-basic',
        name: 'Basic Web Scraping',
        description: 'Navigate to a website and extract data from specific elements',
        category: 'Data Extraction',
        icon: '🌐',
        difficulty: 'beginner',
        estimatedTime: '5-10 minutes',
        tags: ['web-scraping', 'data-extraction', 'automation'],
        variables: {
          target_url: 'https://example.com',
          data_selectors: {}
        },
        steps: [
          {
            id: '1',
            type: 'navigate',
            name: 'Navigate to Website',
            config: {
              url: '{{target_url}}',
              waitAfter: 2000
            }
          },
          {
            id: '2',
            type: 'extract_data',
            name: 'Extract Data',
            config: {
              selectors: '{{data_selectors}}',
              outputVariable: 'scraped_data'
            }
          },
          {
            id: '3',
            type: 'write_file',
            name: 'Save Results',
            config: {
              path: './scraped_data_{{date("timestamp")}}.json',
              content: '{{scraped_data}}'
            }
          }
        ]
      },

      'form-automation': {
        id: 'form-automation',
        name: 'Form Fill Automation',
        description: 'Automatically fill and submit web forms with provided data',
        category: 'Form Processing',
        icon: '📝',
        difficulty: 'beginner',
        estimatedTime: '3-5 minutes',
        tags: ['forms', 'automation', 'data-entry'],
        variables: {
          form_url: 'https://example.com/form',
          form_data: {}
        },
        steps: [
          {
            id: '1',
            type: 'navigate',
            name: 'Open Form Page',
            config: {
              url: '{{form_url}}',
              waitAfter: 1500
            }
          },
          {
            id: '2',
            type: 'type',
            name: 'Fill Name Field',
            config: {
              selector: 'input[name="name"]',
              text: '{{form_data.name}}',
              waitAfter: 500
            }
          },
          {
            id: '3',
            type: 'type',
            name: 'Fill Email Field',
            config: {
              selector: 'input[name="email"]',
              text: '{{form_data.email}}',
              waitAfter: 500
            }
          },
          {
            id: '4',
            type: 'click',
            name: 'Submit Form',
            config: {
              selector: 'button[type="submit"]',
              waitAfter: 2000
            }
          },
          {
            id: '5',
            type: 'screenshot',
            name: 'Capture Result',
            config: {
              filename: 'form_submission_{{date("timestamp")}}.png'
            }
          }
        ]
      },

      'data-validation': {
        id: 'data-validation',
        name: 'Data Validation Workflow',
        description: 'Validate and process CSV data with custom rules',
        category: 'Data Processing',
        icon: '✅',
        difficulty: 'intermediate',
        estimatedTime: '10-15 minutes',
        tags: ['data-validation', 'csv', 'processing'],
        variables: {
          input_file: './data/input.csv',
          validation_rules: {},
          output_file: './data/validated.csv'
        },
        steps: [
          {
            id: '1',
            type: 'read_file',
            name: 'Read CSV File',
            config: {
              path: '{{input_file}}',
              variableName: 'csv_data'
            }
          },
          {
            id: '2',
            type: 'transform_data',
            name: 'Parse CSV',
            config: {
              inputVariable: 'csv_data',
              transformation: 'csv_parse',
              outputVariable: 'parsed_data'
            }
          },
          {
            id: '3',
            type: 'condition',
            name: 'Check Data Validity',
            config: {
              condition: '{{length(parsed_data)}} > 0',
              onTrue: { action: 'continue' },
              onFalse: { action: 'skip_to_step', stepIndex: 6 }
            }
          },
          {
            id: '4',
            type: 'set_variable',
            name: 'Initialize Valid Records',
            config: {
              name: 'valid_records',
              value: '[]'
            }
          },
          {
            id: '5',
            type: 'loop',
            name: 'Validate Each Record',
            config: {
              type: 'for_each',
              array: '{{parsed_data}}',
              steps: [
                {
                  id: '5a',
                  type: 'condition',
                  config: {
                    condition: '{{current_item.email}} != ""',
                    onTrue: { action: 'continue' },
                    onFalse: { action: 'continue' }
                  }
                }
              ]
            }
          },
          {
            id: '6',
            type: 'write_file',
            name: 'Save Valid Records',
            config: {
              path: '{{output_file}}',
              content: '{{valid_records}}'
            }
          }
        ]
      },

      'email-automation': {
        id: 'email-automation',
        name: 'Email Campaign Automation',
        description: 'Send personalized emails to a list of recipients',
        category: 'Communication',
        icon: '📧',
        difficulty: 'intermediate',
        estimatedTime: '15-20 minutes',
        tags: ['email', 'automation', 'communication'],
        variables: {
          recipients_file: './data/recipients.csv',
          email_template: 'Hello {{name}}, this is a personalized message.',
          email_subject: 'Automated Message'
        },
        steps: [
          {
            id: '1',
            type: 'read_file',
            name: 'Load Recipients',
            config: {
              path: '{{recipients_file}}',
              variableName: 'recipients_data'
            }
          },
          {
            id: '2',
            type: 'transform_data',
            name: 'Parse Recipients CSV',
            config: {
              inputVariable: 'recipients_data',
              transformation: 'csv_parse',
              outputVariable: 'recipients'
            }
          },
          {
            id: '3',
            type: 'loop',
            name: 'Send Email to Each Recipient',
            config: {
              type: 'for_each',
              array: '{{recipients}}',
              steps: [
                {
                  id: '3a',
                  type: 'set_variable',
                  config: {
                    name: 'personalized_message',
                    value: '{{replace(email_template, "{{name}}", current_item.name)}}'
                  }
                },
                {
                  id: '3b',
                  type: 'send_email',
                  config: {
                    to: '{{current_item.email}}',
                    subject: '{{email_subject}}',
                    body: '{{personalized_message}}'
                  }
                },
                {
                  id: '3c',
                  type: 'wait',
                  config: {
                    duration: 1000
                  }
                }
              ]
            }
          }
        ]
      },

      'api-integration': {
        id: 'api-integration',
        name: 'API Data Integration',
        description: 'Fetch data from multiple APIs and combine results',
        category: 'API Integration',
        icon: '🔗',
        difficulty: 'advanced',
        estimatedTime: '20-30 minutes',
        tags: ['api', 'integration', 'data-processing'],
        variables: {
          api_endpoints: [],
          api_key: '',
          output_format: 'json'
        },
        steps: [
          {
            id: '1',
            type: 'set_variable',
            name: 'Initialize Results',
            config: {
              name: 'combined_results',
              value: '{}'
            }
          },
          {
            id: '2',
            type: 'loop',
            name: 'Process Each API',
            config: {
              type: 'for_each',
              array: '{{api_endpoints}}',
              steps: [
                {
                  id: '2a',
                  type: 'http_request',
                  config: {
                    url: '{{current_item.url}}',
                    method: 'GET',
                    headers: {
                      'Authorization': 'Bearer {{api_key}}',
                      'Content-Type': 'application/json'
                    },
                    responseVariable: 'api_response'
                  }
                },
                {
                  id: '2b',
                  type: 'condition',
                  config: {
                    condition: '{{api_response_status}} == 200',
                    onTrue: { action: 'continue' },
                    onFalse: { action: 'continue' }
                  }
                },
                {
                  id: '2c',
                  type: 'transform_data',
                  config: {
                    inputVariable: 'combined_results',
                    transformation: 'merge_objects',
                    mergeWith: '{{api_response}}',
                    outputVariable: 'combined_results'
                  }
                }
              ]
            }
          },
          {
            id: '3',
            type: 'write_file',
            name: 'Save Combined Results',
            config: {
              path: './api_results_{{date("timestamp")}}.{{output_format}}',
              content: '{{combined_results}}'
            }
          }
        ]
      }
    }
  }

  /**
   * Get all available templates
   */
  async getAllTemplates(userId, organizationId = null) {
    try {
      // Get built-in templates
      const builtInTemplates = Object.values(this.builtInTemplates)

      // Get user-created templates
      const { data: userTemplates, error: userError } = await this.supabase
        .from('workflow_templates')
        .select('*')
        .eq('created_by', userId)

      if (userError) {
        logger.error('Error fetching user templates', { error: userError.message })
      }

      // Get organization templates
      let orgTemplates = []
      if (organizationId) {
        const { data, error: orgError } = await this.supabase
          .from('workflow_templates')
          .select('*')
          .eq('organization_id', organizationId)
          .eq('is_public', true)

        if (orgError) {
          logger.error('Error fetching organization templates', { error: orgError.message })
        } else {
          orgTemplates = data || []
        }
      }

      // Get public marketplace templates
      const { data: publicTemplates, error: publicError } = await this.supabase
        .from('workflow_templates')
        .select('*')
        .eq('is_public', true)
        .is('organization_id', null)

      if (publicError) {
        logger.error('Error fetching public templates', { error: publicError.message })
      }

      return {
        builtIn: builtInTemplates,
        userCreated: userTemplates || [],
        organization: orgTemplates,
        marketplace: publicTemplates || []
      }

    } catch (error) {
      logger.error('Error getting all templates', { error: error.message })
      throw error
    }
  }

  /**
   * Get template by ID
   */
  async getTemplate(templateId, userId) {
    try {
      // Check built-in templates first
      if (this.builtInTemplates[templateId]) {
        return {
          ...this.builtInTemplates[templateId],
          source: 'built-in'
        }
      }

      // Check database templates
      const { data: template, error } = await this.supabase
        .from('workflow_templates')
        .select('*')
        .eq('id', templateId)
        .single()

      if (error) {
        if (error.code === 'PGRST301') {
          throw new Error('Template not found')
        }
        throw error
      }

      // Check access permissions
      if (!template.is_public && template.created_by !== userId) {
        throw new Error('Access denied')
      }

      return {
        ...template,
        source: 'database'
      }

    } catch (error) {
      logger.error('Error getting template', { templateId, error: error.message })
      throw error
    }
  }

  /**
   * Create workflow from template
   */
  async createWorkflowFromTemplate(templateId, workflowName, variables, userId, organizationId = null) {
    try {
      const template = await this.getTemplate(templateId, userId)

      // Resolve template variables
      const resolvedSteps = this.resolveTemplateVariables(template.steps, variables)
      const resolvedVariables = { ...template.variables, ...variables }

      // Create workflow
      const workflowData = {
        name: workflowName,
        description: `Created from template: ${template.name}`,
        steps: resolvedSteps,
        variables: resolvedVariables,
        user_id: userId,
        organization_id: organizationId,
        status: 'draft',
        template_id: templateId,
        template_version: template.version || 1
      }

      const { data: workflow, error } = await this.supabase
        .from('workflows')
        .insert([workflowData])
        .select()
        .single()

      if (error) {
        throw error
      }

      logger.info('Workflow created from template', {
        workflowId: workflow.id,
        templateId,
        userId
      })

      return workflow

    } catch (error) {
      logger.error('Error creating workflow from template', {
        templateId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Save workflow as template
   */
  async saveWorkflowAsTemplate(workflowId, templateData, userId) {
    try {
      // Get the workflow
      const { data: workflow, error: workflowError } = await this.supabase
        .from('workflows')
        .select('*')
        .eq('id', workflowId)
        .eq('user_id', userId)
        .single()

      if (workflowError) {
        throw new Error('Workflow not found or access denied')
      }

      // Create template
      const template = {
        name: templateData.name,
        description: templateData.description,
        category: templateData.category || 'Custom',
        icon: templateData.icon || '⚙️',
        difficulty: templateData.difficulty || 'intermediate',
        estimated_time: templateData.estimatedTime || '10-15 minutes',
        tags: templateData.tags || [],
        steps: workflow.steps,
        variables: workflow.variables,
        created_by: userId,
        organization_id: templateData.organizationId || null,
        is_public: templateData.isPublic || false,
        version: 1
      }

      const { data: savedTemplate, error } = await this.supabase
        .from('workflow_templates')
        .insert([template])
        .select()
        .single()

      if (error) {
        throw error
      }

      logger.info('Workflow saved as template', {
        workflowId,
        templateId: savedTemplate.id,
        userId
      })

      return savedTemplate

    } catch (error) {
      logger.error('Error saving workflow as template', {
        workflowId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Update template
   */
  async updateTemplate(templateId, updates, userId) {
    try {
      // Check ownership
      const { data: template, error: fetchError } = await this.supabase
        .from('workflow_templates')
        .select('created_by')
        .eq('id', templateId)
        .single()

      if (fetchError || template.created_by !== userId) {
        throw new Error('Template not found or access denied')
      }

      // Update template
      const { data: updatedTemplate, error } = await this.supabase
        .from('workflow_templates')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', templateId)
        .select()
        .single()

      if (error) {
        throw error
      }

      return updatedTemplate

    } catch (error) {
      logger.error('Error updating template', {
        templateId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Delete template
   */
  async deleteTemplate(templateId, userId) {
    try {
      // Check ownership
      const { data: template, error: fetchError } = await this.supabase
        .from('workflow_templates')
        .select('created_by')
        .eq('id', templateId)
        .single()

      if (fetchError || template.created_by !== userId) {
        throw new Error('Template not found or access denied')
      }

      // Delete template
      const { error } = await this.supabase
        .from('workflow_templates')
        .delete()
        .eq('id', templateId)

      if (error) {
        throw error
      }

      logger.info('Template deleted', { templateId, userId })
      return true

    } catch (error) {
      logger.error('Error deleting template', {
        templateId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Get template usage statistics
   */
  async getTemplateStats(templateId) {
    try {
      // Count workflows created from this template
      const { count, error } = await this.supabase
        .from('workflows')
        .select('id', { count: 'exact', head: true })
        .eq('template_id', templateId)

      if (error) {
        throw error
      }

      return {
        usageCount: count || 0
      }

    } catch (error) {
      logger.error('Error getting template stats', {
        templateId,
        error: error.message
      })
      return { usageCount: 0 }
    }
  }

  /**
   * Search templates
   */
  async searchTemplates(query, filters = {}, userId) {
    try {
      let dbQuery = this.supabase
        .from('workflow_templates')
        .select('*')

      // Text search
      if (query) {
        dbQuery = dbQuery.or(`name.ilike.%${query}%,description.ilike.%${query}%,tags.cs.{${query}}`)
      }

      // Category filter
      if (filters.category) {
        dbQuery = dbQuery.eq('category', filters.category)
      }

      // Difficulty filter
      if (filters.difficulty) {
        dbQuery = dbQuery.eq('difficulty', filters.difficulty)
      }

      // Public templates only (unless user owns it)
      dbQuery = dbQuery.or(`is_public.eq.true,created_by.eq.${userId}`)

      const { data: templates, error } = await dbQuery

      if (error) {
        throw error
      }

      // Search built-in templates
      let builtInResults = []
      if (query) {
        builtInResults = Object.values(this.builtInTemplates).filter(template =>
          template.name.toLowerCase().includes(query.toLowerCase()) ||
          template.description.toLowerCase().includes(query.toLowerCase()) ||
          template.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
        )
      }

      return {
        database: templates || [],
        builtIn: builtInResults
      }

    } catch (error) {
      logger.error('Error searching templates', { query, error: error.message })
      throw error
    }
  }

  /**
   * Resolve template variables in steps
   */
  resolveTemplateVariables(steps, variables) {
    const resolveValue = (value) => {
      if (typeof value === 'string') {
        return value.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
          return variables[varName] !== undefined ? variables[varName] : match
        })
      }
      
      if (Array.isArray(value)) {
        return value.map(resolveValue)
      }
      
      if (value && typeof value === 'object') {
        const resolved = {}
        for (const [key, val] of Object.entries(value)) {
          resolved[key] = resolveValue(val)
        }
        return resolved
      }
      
      return value
    }

    return steps.map(step => ({
      ...step,
      config: resolveValue(step.config)
    }))
  }

  /**
   * Get template categories
   */
  getCategories() {
    const builtInCategories = [...new Set(Object.values(this.builtInTemplates).map(t => t.category))]
    
    return [
      ...builtInCategories,
      'Custom',
      'Data Processing',
      'Web Automation',
      'API Integration',
      'Communication',
      'File Operations',
      'Testing'
    ].sort()
  }
}