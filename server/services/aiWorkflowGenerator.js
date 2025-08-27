/**
 * 🤖 AI-Powered Workflow Generator
 * Natural language processing to generate workflows from user descriptions
 */

import { logger } from '../middleware/errorHandler.js'
import { VariableResolver } from '../utils/variableResolver.js'

export class AIWorkflowGenerator {
  constructor(supabase) {
    this.supabase = supabase
    this.variableResolver = new VariableResolver()
    this.setupPatternMatchers()
    this.setupStepTemplates()
  }

  /**
   * Setup pattern matchers for different automation types
   */
  setupPatternMatchers() {
    this.patterns = {
      navigation: {
        keywords: ['go to', 'navigate to', 'visit', 'open', 'browse to'],
        examples: ['go to https://example.com', 'navigate to the login page'],
        stepType: 'navigate'
      },
      
      clicking: {
        keywords: ['click', 'press', 'tap', 'select', 'choose'],
        examples: ['click the login button', 'press submit', 'select the dropdown'],
        stepType: 'click'
      },
      
      typing: {
        keywords: ['type', 'enter', 'input', 'fill', 'write'],
        examples: ['type username', 'enter email address', 'fill in the form'],
        stepType: 'type'
      },
      
      waiting: {
        keywords: ['wait', 'pause', 'delay', 'sleep'],
        examples: ['wait 5 seconds', 'pause for loading', 'delay 2 minutes'],
        stepType: 'wait'
      },
      
      extraction: {
        keywords: ['extract', 'get', 'scrape', 'collect', 'gather', 'capture'],
        examples: ['extract all product names', 'get the price', 'scrape contact info'],
        stepType: 'extract_data'
      },
      
      screenshot: {
        keywords: ['screenshot', 'capture', 'take picture', 'save image'],
        examples: ['take a screenshot', 'capture the page', 'save image of results'],
        stepType: 'screenshot'
      },
      
      scrolling: {
        keywords: ['scroll', 'scroll down', 'scroll up', 'page down'],
        examples: ['scroll to bottom', 'scroll down the page', 'page down'],
        stepType: 'scroll'
      },
      
      conditions: {
        keywords: ['if', 'when', 'check if', 'verify', 'ensure'],
        examples: ['if login fails', 'when page loads', 'check if element exists'],
        stepType: 'condition'
      },
      
      loops: {
        keywords: ['repeat', 'for each', 'loop', 'iterate', 'do for all'],
        examples: ['repeat 5 times', 'for each product', 'loop through items'],
        stepType: 'loop'
      },
      
      email: {
        keywords: ['send email', 'email', 'notify', 'send message'],
        examples: ['send email notification', 'email the results', 'notify team'],
        stepType: 'send_email'
      },
      
      fileOperations: {
        keywords: ['save to file', 'export', 'download', 'save data', 'write file'],
        examples: ['save to CSV', 'export results', 'download file', 'write to database'],
        stepType: 'write_file'
      },
      
      apiCalls: {
        keywords: ['call api', 'send request', 'post data', 'get data from api'],
        examples: ['call the REST API', 'send POST request', 'get user data'],
        stepType: 'http_request'
      }
    }
  }

  /**
   * Setup step templates for common automation patterns
   */
  setupStepTemplates() {
    this.stepTemplates = {
      webScraping: {
        name: 'Web Scraping Template',
        description: 'Extract data from a website',
        steps: [
          { type: 'navigate', description: 'Navigate to target website' },
          { type: 'wait', description: 'Wait for page to load' },
          { type: 'extract_data', description: 'Extract required data' },
          { type: 'write_file', description: 'Save extracted data' }
        ]
      },
      
      formAutomation: {
        name: 'Form Automation Template',
        description: 'Fill and submit web forms',
        steps: [
          { type: 'navigate', description: 'Navigate to form page' },
          { type: 'type', description: 'Fill form fields' },
          { type: 'click', description: 'Submit form' },
          { type: 'wait', description: 'Wait for confirmation' },
          { type: 'screenshot', description: 'Capture result' }
        ]
      },
      
      dataProcessing: {
        name: 'Data Processing Template',
        description: 'Process and transform data',
        steps: [
          { type: 'read_file', description: 'Read input data' },
          { type: 'transform_data', description: 'Process data' },
          { type: 'condition', description: 'Validate results' },
          { type: 'write_file', description: 'Save processed data' }
        ]
      },
      
      apiIntegration: {
        name: 'API Integration Template',
        description: 'Integrate with external APIs',
        steps: [
          { type: 'http_request', description: 'Call external API' },
          { type: 'condition', description: 'Check response status' },
          { type: 'transform_data', description: 'Process API response' },
          { type: 'send_email', description: 'Send notification' }
        ]
      },
      
      monitoringAlert: {
        name: 'Monitoring & Alert Template',
        description: 'Monitor websites and send alerts',
        steps: [
          { type: 'navigate', description: 'Navigate to monitoring target' },
          { type: 'extract_data', description: 'Extract status information' },
          { type: 'condition', description: 'Check if alert condition met' },
          { type: 'send_email', description: 'Send alert notification' }
        ]
      }
    }
  }

  /**
   * Generate workflow from natural language description
   */
  async generateWorkflow(description, userId, options = {}) {
    try {
      logger.info('Generating workflow from description', { 
        description: description.substring(0, 100) + '...', 
        userId 
      })

      // Clean and prepare the description
      const cleanDescription = this.cleanDescription(description)
      
      // Analyze the description to understand intent
      const analysis = this.analyzeDescription(cleanDescription)
      
      // Generate workflow steps based on analysis
      const steps = this.generateSteps(analysis, cleanDescription)
      
      // Extract variables from description
      const variables = this.extractVariables(cleanDescription, steps)
      
      // Generate workflow metadata
      const metadata = this.generateMetadata(analysis, cleanDescription)
      
      // Create the workflow structure
      const workflow = {
        name: metadata.name,
        description: metadata.description,
        category: metadata.category,
        steps: steps,
        variables: variables,
        user_id: userId,
        status: 'draft',
        ai_generated: true,
        ai_confidence: analysis.confidence,
        ai_analysis: {
          intent: analysis.intent,
          complexity: analysis.complexity,
          patterns: analysis.patterns,
          originalDescription: description
        }
      }

      // Store the generated workflow
      const { data: savedWorkflow, error } = await this.supabase
        .from('workflows')
        .insert([workflow])
        .select()
        .single()

      if (error) {
        throw error
      }

      logger.info('AI workflow generated successfully', { 
        workflowId: savedWorkflow.id, 
        confidence: analysis.confidence 
      })

      return {
        workflow: savedWorkflow,
        analysis: analysis,
        suggestions: this.generateImprovementSuggestions(analysis, steps)
      }

    } catch (error) {
      logger.error('Error generating AI workflow', { error: error.message })
      throw error
    }
  }

  /**
   * Analyze natural language description to understand automation intent
   */
  analyzeDescription(description) {
    const analysis = {
      intent: 'unknown',
      confidence: 0,
      complexity: 'simple',
      patterns: [],
      entities: [],
      actions: []
    }

    const lowerDesc = description.toLowerCase()
    const sentences = description.split(/[.!?]+/).filter(s => s.trim().length > 0)
    
    // Detect automation patterns
    for (const [patternType, patternConfig] of Object.entries(this.patterns)) {
      const matchCount = patternConfig.keywords.filter(keyword => 
        lowerDesc.includes(keyword)
      ).length

      if (matchCount > 0) {
        analysis.patterns.push({
          type: patternType,
          confidence: matchCount / patternConfig.keywords.length,
          stepType: patternConfig.stepType
        })
      }
    }

    // Determine primary intent based on patterns
    if (analysis.patterns.length > 0) {
      const primaryPattern = analysis.patterns
        .sort((a, b) => b.confidence - a.confidence)[0]
      
      analysis.intent = this.determineIntent(analysis.patterns)
      analysis.confidence = this.calculateConfidence(analysis.patterns, sentences.length)
    }

    // Determine complexity
    analysis.complexity = this.determineComplexity(sentences.length, analysis.patterns.length)

    // Extract entities (URLs, file paths, numbers, etc.)
    analysis.entities = this.extractEntities(description)

    // Extract actions from each sentence
    analysis.actions = sentences.map(sentence => this.extractActions(sentence))

    return analysis
  }

  /**
   * Generate workflow steps based on analysis
   */
  generateSteps(analysis, description) {
    const steps = []
    let stepCounter = 1

    // Use template-based generation for high confidence
    if (analysis.confidence > 0.7) {
      const template = this.selectTemplate(analysis)
      if (template) {
        return this.generateStepsFromTemplate(template, analysis, description)
      }
    }

    // Pattern-based step generation
    const sortedPatterns = analysis.patterns.sort((a, b) => b.confidence - a.confidence)
    const processedActions = new Set()

    for (const action of analysis.actions.flat()) {
      if (processedActions.has(action.text)) continue
      
      const matchingPattern = sortedPatterns.find(p => 
        action.text.toLowerCase().includes(p.type) || 
        this.patterns[p.type].keywords.some(keyword => 
          action.text.toLowerCase().includes(keyword)
        )
      )

      if (matchingPattern) {
        const step = this.createStepFromPattern(matchingPattern, action, stepCounter++)
        if (step) {
          steps.push(step)
          processedActions.add(action.text)
        }
      }
    }

    // Add default steps if none generated
    if (steps.length === 0) {
      steps.push(...this.generateDefaultSteps(analysis))
    }

    return steps
  }

  /**
   * Create step from pattern and action
   */
  createStepFromPattern(pattern, action, stepIndex) {
    const stepConfig = {
      id: stepIndex.toString(),
      type: pattern.stepType,
      name: this.generateStepName(pattern.stepType, action.text),
      config: {}
    }

    switch (pattern.stepType) {
      case 'navigate':
        const url = this.extractURL(action.text) || '{{target_url}}'
        stepConfig.config = {
          url: url,
          waitAfter: 2000
        }
        break

      case 'click':
        const selector = this.extractSelector(action.text) || '{{click_selector}}'
        stepConfig.config = {
          selector: selector,
          waitAfter: 1000
        }
        break

      case 'type':
        const inputSelector = this.extractSelector(action.text) || '{{input_selector}}'
        const inputText = this.extractInputText(action.text) || '{{input_text}}'
        stepConfig.config = {
          selector: inputSelector,
          text: inputText,
          waitAfter: 500
        }
        break

      case 'wait':
        const duration = this.extractDuration(action.text) || 3000
        stepConfig.config = {
          duration: duration
        }
        break

      case 'extract_data':
        stepConfig.config = {
          selectors: this.extractDataSelectors(action.text),
          outputVariable: 'extracted_data'
        }
        break

      case 'screenshot':
        stepConfig.config = {
          filename: 'screenshot_{{date("timestamp")}}.png'
        }
        break

      case 'scroll':
        stepConfig.config = {
          direction: this.extractScrollDirection(action.text) || 'down',
          amount: this.extractScrollAmount(action.text) || 100
        }
        break

      case 'send_email':
        stepConfig.config = {
          to: '{{recipient_email}}',
          subject: 'Automation Result',
          body: '{{email_message}}'
        }
        break

      case 'write_file':
        stepConfig.config = {
          path: this.extractFilePath(action.text) || './output_{{date("timestamp")}}.txt',
          content: '{{file_content}}'
        }
        break

      case 'http_request':
        stepConfig.config = {
          url: this.extractURL(action.text) || '{{api_url}}',
          method: this.extractHTTPMethod(action.text) || 'GET',
          responseVariable: 'api_response'
        }
        break

      default:
        return null
    }

    return stepConfig
  }

  /**
   * Generate steps from template
   */
  generateStepsFromTemplate(template, analysis, description) {
    const steps = []
    let stepCounter = 1

    for (const templateStep of template.steps) {
      const step = {
        id: stepCounter.toString(),
        type: templateStep.type,
        name: templateStep.description,
        config: this.generateStepConfig(templateStep.type, analysis, description)
      }
      
      steps.push(step)
      stepCounter++
    }

    return steps
  }

  /**
   * Generate step configuration based on type and analysis
   */
  generateStepConfig(stepType, analysis, description) {
    const config = {}

    switch (stepType) {
      case 'navigate':
        const url = this.extractURL(description)
        config.url = url || '{{target_url}}'
        config.waitAfter = 2000
        break

      case 'type':
        config.selector = '{{input_selector}}'
        config.text = '{{input_text}}'
        config.waitAfter = 500
        break

      case 'click':
        config.selector = '{{button_selector}}'
        config.waitAfter = 1000
        break

      case 'wait':
        config.duration = 3000
        break

      case 'extract_data':
        config.selectors = { data: '{{data_selector}}' }
        config.outputVariable = 'extracted_data'
        break

      case 'screenshot':
        config.filename = 'result_{{date("timestamp")}}.png'
        break

      case 'write_file':
        config.path = './results_{{date("timestamp")}}.json'
        config.content = '{{output_data}}'
        break

      case 'send_email':
        config.to = '{{notification_email}}'
        config.subject = 'Workflow Completed'
        config.body = 'The automation workflow has completed successfully.'
        break

      case 'http_request':
        config.url = '{{api_endpoint}}'
        config.method = 'GET'
        config.responseVariable = 'api_response'
        break

      default:
        break
    }

    return config
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Clean and normalize description text
   */
  cleanDescription(description) {
    return description
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s.,;:!?()-]/g, '')
  }

  /**
   * Determine primary intent from patterns
   */
  determineIntent(patterns) {
    const intentMap = {
      navigation: 'web_automation',
      clicking: 'web_automation', 
      typing: 'form_automation',
      extraction: 'data_extraction',
      email: 'notification',
      fileOperations: 'data_processing',
      apiCalls: 'api_integration'
    }

    const primaryPattern = patterns.sort((a, b) => b.confidence - a.confidence)[0]
    return intentMap[primaryPattern.type] || 'general_automation'
  }

  /**
   * Calculate overall confidence score
   */
  calculateConfidence(patterns, sentenceCount) {
    if (patterns.length === 0) return 0

    const avgPatternConfidence = patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length
    const coverageBonus = Math.min(patterns.length / sentenceCount, 1) * 0.3
    
    return Math.min(avgPatternConfidence + coverageBonus, 1)
  }

  /**
   * Determine workflow complexity
   */
  determineComplexity(sentenceCount, patternCount) {
    if (sentenceCount <= 2 && patternCount <= 2) return 'simple'
    if (sentenceCount <= 5 && patternCount <= 4) return 'medium'
    return 'complex'
  }

  /**
   * Extract entities like URLs, emails, file paths from text
   */
  extractEntities(text) {
    const entities = []

    // URLs
    const urlRegex = /https?:\/\/[^\s]+/gi
    const urls = text.match(urlRegex) || []
    urls.forEach(url => entities.push({ type: 'url', value: url }))

    // Email addresses
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi
    const emails = text.match(emailRegex) || []
    emails.forEach(email => entities.push({ type: 'email', value: email }))

    // File paths
    const filePathRegex = /[./\\][\w./\\-]+\.(csv|json|txt|xlsx|pdf)/gi
    const filePaths = text.match(filePathRegex) || []
    filePaths.forEach(path => entities.push({ type: 'file_path', value: path }))

    // Numbers
    const numberRegex = /\b\d+\b/g
    const numbers = text.match(numberRegex) || []
    numbers.forEach(num => entities.push({ type: 'number', value: parseInt(num) }))

    return entities
  }

  /**
   * Extract actions from sentence
   */
  extractActions(sentence) {
    const actions = []
    const words = sentence.toLowerCase().split(/\s+/)
    
    // Look for action verbs
    const actionVerbs = ['go', 'click', 'type', 'enter', 'fill', 'extract', 'get', 'send', 'save', 'download']
    
    for (let i = 0; i < words.length; i++) {
      if (actionVerbs.includes(words[i])) {
        // Get context around the action verb
        const start = Math.max(0, i - 2)
        const end = Math.min(words.length, i + 5)
        const context = words.slice(start, end).join(' ')
        
        actions.push({
          verb: words[i],
          text: context,
          position: i
        })
      }
    }

    return actions.length > 0 ? actions : [{ verb: 'unknown', text: sentence, position: 0 }]
  }

  /**
   * Select appropriate template based on analysis
   */
  selectTemplate(analysis) {
    const intentTemplateMap = {
      'web_automation': this.stepTemplates.formAutomation,
      'data_extraction': this.stepTemplates.webScraping,
      'data_processing': this.stepTemplates.dataProcessing,
      'api_integration': this.stepTemplates.apiIntegration,
      'notification': this.stepTemplates.monitoringAlert
    }

    return intentTemplateMap[analysis.intent] || null
  }

  /**
   * Generate default steps for low confidence scenarios
   */
  generateDefaultSteps(analysis) {
    return [
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
        type: 'wait',
        name: 'Wait for Page Load',
        config: {
          duration: 3000
        }
      },
      {
        id: '3',
        type: 'screenshot',
        name: 'Take Screenshot',
        config: {
          filename: 'result_{{date("timestamp")}}.png'
        }
      }
    ]
  }

  /**
   * Extract variables from description and steps
   */
  extractVariables(description, steps) {
    const variables = {}

    // Extract URLs
    const urls = this.extractEntities(description).filter(e => e.type === 'url')
    if (urls.length > 0) {
      variables.target_url = urls[0].value
    }

    // Add common variables based on step types
    const stepTypes = steps.map(s => s.type)
    
    if (stepTypes.includes('type')) {
      variables.input_text = ''
      variables.input_selector = ''
    }
    
    if (stepTypes.includes('click')) {
      variables.button_selector = ''
    }
    
    if (stepTypes.includes('extract_data')) {
      variables.data_selector = ''
    }
    
    if (stepTypes.includes('send_email')) {
      variables.recipient_email = ''
      variables.email_message = ''
    }

    return variables
  }

  /**
   * Generate workflow metadata
   */
  generateMetadata(analysis, description) {
    const name = this.generateWorkflowName(description, analysis.intent)
    const category = this.mapIntentToCategory(analysis.intent)
    
    return {
      name: name,
      description: `AI-generated workflow: ${description.substring(0, 100)}${description.length > 100 ? '...' : ''}`,
      category: category
    }
  }

  /**
   * Generate workflow name from description
   */
  generateWorkflowName(description, intent) {
    const words = description.split(/\s+/).slice(0, 6)
    const baseName = words.join(' ').replace(/[^\w\s]/g, '')
    
    if (baseName.length > 50) {
      return baseName.substring(0, 47) + '...'
    }
    
    return baseName || `${intent.replace('_', ' ')} workflow`
  }

  /**
   * Map intent to workflow category
   */
  mapIntentToCategory(intent) {
    const categoryMap = {
      'web_automation': 'Web Automation',
      'data_extraction': 'Data Extraction', 
      'form_automation': 'Form Processing',
      'data_processing': 'Data Processing',
      'api_integration': 'API Integration',
      'notification': 'Communication',
      'general_automation': 'General'
    }

    return categoryMap[intent] || 'AI Generated'
  }

  /**
   * Generate improvement suggestions
   */
  generateImprovementSuggestions(analysis, steps) {
    const suggestions = []

    if (analysis.confidence < 0.6) {
      suggestions.push({
        type: 'low_confidence',
        message: 'This workflow was generated with low confidence. Please review and adjust the steps.',
        priority: 'high'
      })
    }

    if (steps.length < 3) {
      suggestions.push({
        type: 'simple_workflow',
        message: 'Consider adding error handling and validation steps for more robust automation.',
        priority: 'medium'
      })
    }

    if (steps.some(s => Object.values(s.config).some(v => typeof v === 'string' && v.includes('{{')))) {
      suggestions.push({
        type: 'variables_needed',
        message: 'Some steps contain placeholder variables. Update these with actual values before running.',
        priority: 'high'
      })
    }

    return suggestions
  }

  // ============================================================================
  // EXTRACTION HELPER METHODS
  // ============================================================================

  extractURL(text) {
    const urlMatch = text.match(/https?:\/\/[^\s]+/i)
    return urlMatch ? urlMatch[0] : null
  }

  extractSelector(text) {
    // Try to extract CSS selectors from common descriptions
    const selectorPatterns = [
      /["']([.#]?[\w-]+)["']/,  // Quoted selectors
      /button[\s]+["']([^"']+)["']/i,  // "button 'text'"
      /input[\s]+["']([^"']+)["']/i,   // "input 'name'"
      /click[\s]+["']([^"']+)["']/i    // "click 'element'"
    ]

    for (const pattern of selectorPatterns) {
      const match = text.match(pattern)
      if (match) return match[1]
    }

    return null
  }

  extractInputText(text) {
    const inputPatterns = [
      /["']([^"']{2,})["']/,  // Quoted text
      /with[\s]+"([^"]+)"/i,  // "with 'text'"
      /enter[\s]+"([^"]+)"/i  // "enter 'text'"
    ]

    for (const pattern of inputPatterns) {
      const match = text.match(pattern)
      if (match) return match[1]
    }

    return null
  }

  extractDuration(text) {
    const durationMatch = text.match(/(\d+)[\s]*(second|sec|minute|min|hour|hr)s?/i)
    if (durationMatch) {
      const value = parseInt(durationMatch[1])
      const unit = durationMatch[2].toLowerCase()
      
      switch (unit) {
        case 'second':
        case 'sec':
          return value * 1000
        case 'minute':
        case 'min':
          return value * 60 * 1000
        case 'hour':
        case 'hr':
          return value * 60 * 60 * 1000
      }
    }
    return null
  }

  extractDataSelectors(text) {
    // Extract data fields to scrape
    const selectors = {}
    const fieldPatterns = [
      /get[\s]+the[\s]+(\w+)/gi,
      /extract[\s]+(\w+)/gi,
      /scrape[\s]+(\w+)/gi
    ]

    for (const pattern of fieldPatterns) {
      const matches = [...text.matchAll(pattern)]
      matches.forEach(match => {
        const fieldName = match[1].toLowerCase()
        selectors[fieldName] = `{{${fieldName}_selector}}`
      })
    }

    return Object.keys(selectors).length > 0 ? selectors : { data: '{{data_selector}}' }
  }

  extractScrollDirection(text) {
    if (text.includes('up')) return 'up'
    if (text.includes('down')) return 'down'
    if (text.includes('left')) return 'left'
    if (text.includes('right')) return 'right'
    return 'down'
  }

  extractScrollAmount(text) {
    const amountMatch = text.match(/(\d+)[\s]*(px|pixel|%|percent)?/i)
    return amountMatch ? parseInt(amountMatch[1]) : 100
  }

  extractFilePath(text) {
    const pathMatch = text.match(/[./\\]?[\w./\\-]+\.(csv|json|txt|xlsx|pdf)/i)
    return pathMatch ? pathMatch[0] : null
  }

  extractHTTPMethod(text) {
    const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
    const upperText = text.toUpperCase()
    
    for (const method of methods) {
      if (upperText.includes(method)) return method
    }
    
    return 'GET'
  }

  generateStepName(stepType, actionText) {
    const stepNames = {
      navigate: 'Navigate to Website',
      click: 'Click Element',
      type: 'Enter Text',
      wait: 'Wait',
      extract_data: 'Extract Data',
      screenshot: 'Take Screenshot',
      scroll: 'Scroll Page',
      send_email: 'Send Email',
      write_file: 'Save File',
      http_request: 'API Request'
    }

    return stepNames[stepType] || 'Automation Step'
  }
}