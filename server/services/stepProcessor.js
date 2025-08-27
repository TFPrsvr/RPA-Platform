/**
 * 🔄 Step Processor
 * Handles execution of individual workflow steps
 */

import { logger } from '../middleware/errorHandler.js'
import { VariableResolver } from '../utils/variableResolver.js'

export class StepProcessor {
  constructor() {
    this.variableResolver = new VariableResolver()
    this.stepHandlers = new Map()
    this.setupStepHandlers()
  }

  /**
   * Setup step handlers for different step types
   */
  setupStepHandlers() {
    // Browser automation steps
    this.stepHandlers.set('click', this.handleClick.bind(this))
    this.stepHandlers.set('type', this.handleType.bind(this))
    this.stepHandlers.set('wait', this.handleWait.bind(this))
    this.stepHandlers.set('navigate', this.handleNavigate.bind(this))
    this.stepHandlers.set('screenshot', this.handleScreenshot.bind(this))
    this.stepHandlers.set('scroll', this.handleScroll.bind(this))

    // Data manipulation steps
    this.stepHandlers.set('extract_text', this.handleExtractText.bind(this))
    this.stepHandlers.set('extract_data', this.handleExtractData.bind(this))
    this.stepHandlers.set('set_variable', this.handleSetVariable.bind(this))
    this.stepHandlers.set('transform_data', this.handleTransformData.bind(this))

    // Logic and control flow steps
    this.stepHandlers.set('condition', this.handleCondition.bind(this))
    this.stepHandlers.set('loop', this.handleLoop.bind(this))
    this.stepHandlers.set('break', this.handleBreak.bind(this))
    this.stepHandlers.set('continue', this.handleContinue.bind(this))

    // External integration steps
    this.stepHandlers.set('http_request', this.handleHttpRequest.bind(this))
    this.stepHandlers.set('send_email', this.handleSendEmail.bind(this))
    this.stepHandlers.set('webhook', this.handleWebhook.bind(this))

    // File operations
    this.stepHandlers.set('read_file', this.handleReadFile.bind(this))
    this.stepHandlers.set('write_file', this.handleWriteFile.bind(this))
    this.stepHandlers.set('download_file', this.handleDownloadFile.bind(this))
  }

  /**
   * Process a workflow step
   */
  async processStep(step, context) {
    const startTime = Date.now()

    try {
      logger.debug('Processing step', { 
        stepId: step.id, 
        stepType: step.type,
        executionId: context.id
      })

      // Resolve variables in step configuration
      const resolvedConfig = this.variableResolver.resolveVariables(step.config, context.variables)

      // Get step handler
      const handler = this.stepHandlers.get(step.type)
      if (!handler) {
        throw new Error(`Unknown step type: ${step.type}`)
      }

      // Execute step
      const result = await handler(resolvedConfig, context)

      const executionTime = Date.now() - startTime

      return {
        success: true,
        result,
        executionTime,
        timestamp: new Date().toISOString(),
        ...result
      }

    } catch (error) {
      const executionTime = Date.now() - startTime

      logger.error('Step processing failed', {
        stepId: step.id,
        stepType: step.type,
        executionId: context.id,
        error: error.message
      })

      return {
        success: false,
        error: error.message,
        executionTime,
        timestamp: new Date().toISOString()
      }
    }
  }

  // ============================================================================
  // BROWSER AUTOMATION HANDLERS
  // ============================================================================

  async handleClick(config, context) {
    logger.info('Executing click step', { selector: config.selector })
    
    // Simulate browser automation
    await this.delay(config.waitAfter || 1000)
    
    return {
      action: 'click',
      selector: config.selector,
      success: true,
      message: `Clicked element: ${config.selector}`
    }
  }

  async handleType(config, context) {
    logger.info('Executing type step', { selector: config.selector, text: config.text?.substring(0, 50) })
    
    await this.delay(config.waitAfter || 500)
    
    return {
      action: 'type',
      selector: config.selector,
      text: config.text,
      success: true,
      message: `Typed text into: ${config.selector}`
    }
  }

  async handleWait(config, context) {
    const duration = parseInt(config.duration) || 1000
    logger.info('Executing wait step', { duration })
    
    await this.delay(duration)
    
    return {
      action: 'wait',
      duration,
      success: true,
      message: `Waited for ${duration}ms`
    }
  }

  async handleNavigate(config, context) {
    logger.info('Executing navigate step', { url: config.url })
    
    await this.delay(config.waitAfter || 2000)
    
    return {
      action: 'navigate',
      url: config.url,
      success: true,
      message: `Navigated to: ${config.url}`
    }
  }

  async handleScreenshot(config, context) {
    logger.info('Executing screenshot step')
    
    await this.delay(1000)
    
    const filename = `screenshot_${context.id}_${Date.now()}.png`
    
    return {
      action: 'screenshot',
      filename,
      path: `/screenshots/${filename}`,
      success: true,
      message: 'Screenshot captured',
      variables: {
        last_screenshot: filename
      }
    }
  }

  async handleScroll(config, context) {
    logger.info('Executing scroll step', { direction: config.direction, amount: config.amount })
    
    await this.delay(500)
    
    return {
      action: 'scroll',
      direction: config.direction || 'down',
      amount: config.amount || 100,
      success: true,
      message: `Scrolled ${config.direction || 'down'} by ${config.amount || 100}px`
    }
  }

  // ============================================================================
  // DATA MANIPULATION HANDLERS
  // ============================================================================

  async handleExtractText(config, context) {
    logger.info('Executing extract text step', { selector: config.selector })
    
    await this.delay(500)
    
    // Simulate text extraction
    const extractedText = `Sample text from ${config.selector}`
    const variableName = config.variableName || 'extracted_text'
    
    return {
      action: 'extract_text',
      selector: config.selector,
      extractedText,
      success: true,
      message: `Extracted text from: ${config.selector}`,
      variables: {
        [variableName]: extractedText
      }
    }
  }

  async handleExtractData(config, context) {
    logger.info('Executing extract data step', { selectors: Object.keys(config.selectors || {}) })
    
    await this.delay(1000)
    
    const extractedData = {}
    for (const [key, selector] of Object.entries(config.selectors || {})) {
      extractedData[key] = `Sample data from ${selector}`
    }
    
    return {
      action: 'extract_data',
      extractedData,
      success: true,
      message: `Extracted ${Object.keys(extractedData).length} data points`,
      variables: extractedData
    }
  }

  async handleSetVariable(config, context) {
    logger.info('Executing set variable step', { variable: config.name, value: config.value })
    
    const value = this.variableResolver.resolveVariables(config.value, context.variables)
    
    return {
      action: 'set_variable',
      name: config.name,
      value,
      success: true,
      message: `Set variable ${config.name} = ${value}`,
      variables: {
        [config.name]: value
      }
    }
  }

  async handleTransformData(config, context) {
    logger.info('Executing transform data step', { transformation: config.transformation })
    
    await this.delay(300)
    
    const inputValue = context.variables[config.inputVariable]
    let transformedValue = inputValue
    
    // Apply transformation based on type
    switch (config.transformation) {
      case 'uppercase':
        transformedValue = String(inputValue).toUpperCase()
        break
      case 'lowercase':
        transformedValue = String(inputValue).toLowerCase()
        break
      case 'trim':
        transformedValue = String(inputValue).trim()
        break
      case 'parse_number':
        transformedValue = parseFloat(inputValue) || 0
        break
      case 'json_parse':
        transformedValue = JSON.parse(inputValue)
        break
      default:
        throw new Error(`Unknown transformation: ${config.transformation}`)
    }
    
    return {
      action: 'transform_data',
      transformation: config.transformation,
      inputValue,
      transformedValue,
      success: true,
      message: `Transformed data using ${config.transformation}`,
      variables: {
        [config.outputVariable]: transformedValue
      }
    }
  }

  // ============================================================================
  // LOGIC AND CONTROL FLOW HANDLERS
  // ============================================================================

  async handleCondition(config, context) {
    logger.info('Executing condition step', { condition: config.condition })
    
    const result = this.evaluateCondition(config.condition, context.variables)
    
    let nextAction = {}
    
    if (result) {
      if (config.onTrue?.action === 'skip_to_step') {
        nextAction.skipToStep = config.onTrue.stepIndex
      }
    } else {
      if (config.onFalse?.action === 'skip_to_step') {
        nextAction.skipToStep = config.onFalse.stepIndex
      }
    }
    
    return {
      action: 'condition',
      condition: config.condition,
      result,
      success: true,
      message: `Condition evaluated to: ${result}`,
      ...nextAction
    }
  }

  async handleLoop(config, context) {
    logger.info('Executing loop step', { type: config.type })
    
    // For now, just simulate loop processing
    await this.delay(100)
    
    return {
      action: 'loop',
      type: config.type,
      success: true,
      message: `Loop step processed`
    }
  }

  async handleBreak(config, context) {
    logger.info('Executing break step')
    
    return {
      action: 'break',
      success: true,
      message: 'Break execution',
      breakExecution: true
    }
  }

  async handleContinue(config, context) {
    logger.info('Executing continue step')
    
    return {
      action: 'continue',
      success: true,
      message: 'Continue to next iteration'
    }
  }

  // ============================================================================
  // EXTERNAL INTEGRATION HANDLERS
  // ============================================================================

  async handleHttpRequest(config, context) {
    logger.info('Executing HTTP request step', { method: config.method, url: config.url })
    
    try {
      const response = await fetch(config.url, {
        method: config.method || 'GET',
        headers: config.headers || {},
        body: config.body ? JSON.stringify(config.body) : undefined
      })
      
      const responseData = await response.text()
      let parsedData = responseData
      
      try {
        parsedData = JSON.parse(responseData)
      } catch (e) {
        // Not JSON, keep as text
      }
      
      const variableName = config.responseVariable || 'http_response'
      
      return {
        action: 'http_request',
        method: config.method,
        url: config.url,
        status: response.status,
        success: response.ok,
        message: `HTTP ${config.method} to ${config.url} - Status: ${response.status}`,
        variables: {
          [variableName]: parsedData,
          [`${variableName}_status`]: response.status
        }
      }
    } catch (error) {
      throw new Error(`HTTP request failed: ${error.message}`)
    }
  }

  async handleSendEmail(config, context) {
    logger.info('Executing send email step', { to: config.to, subject: config.subject })
    
    // Simulate email sending
    await this.delay(2000)
    
    return {
      action: 'send_email',
      to: config.to,
      subject: config.subject,
      success: true,
      message: `Email sent to: ${config.to}`
    }
  }

  async handleWebhook(config, context) {
    logger.info('Executing webhook step', { url: config.url })
    
    const payload = {
      executionId: context.id,
      workflowId: context.workflowId,
      data: config.data || {},
      timestamp: new Date().toISOString()
    }
    
    return await this.handleHttpRequest({
      url: config.url,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      responseVariable: 'webhook_response'
    }, context)
  }

  // ============================================================================
  // FILE OPERATION HANDLERS
  // ============================================================================

  async handleReadFile(config, context) {
    logger.info('Executing read file step', { path: config.path })
    
    await this.delay(500)
    
    // Simulate file reading
    const content = `Sample file content from ${config.path}`
    const variableName = config.variableName || 'file_content'
    
    return {
      action: 'read_file',
      path: config.path,
      success: true,
      message: `Read file: ${config.path}`,
      variables: {
        [variableName]: content
      }
    }
  }

  async handleWriteFile(config, context) {
    logger.info('Executing write file step', { path: config.path })
    
    await this.delay(800)
    
    return {
      action: 'write_file',
      path: config.path,
      content: config.content,
      success: true,
      message: `Written file: ${config.path}`
    }
  }

  async handleDownloadFile(config, context) {
    logger.info('Executing download file step', { url: config.url })
    
    await this.delay(3000)
    
    const filename = config.filename || `download_${Date.now()}.file`
    
    return {
      action: 'download_file',
      url: config.url,
      filename,
      success: true,
      message: `Downloaded file: ${filename}`,
      variables: {
        downloaded_file: filename
      }
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Evaluate conditional expressions
   */
  evaluateCondition(condition, variables) {
    try {
      // Simple condition evaluation
      // In production, use a more secure expression evaluator
      const resolvedCondition = this.variableResolver.resolveVariables(condition, variables)
      
      // Basic comparisons
      if (resolvedCondition.includes('==')) {
        const [left, right] = resolvedCondition.split('==').map(s => s.trim())
        return left === right
      }
      
      if (resolvedCondition.includes('!=')) {
        const [left, right] = resolvedCondition.split('!=').map(s => s.trim())
        return left !== right
      }
      
      if (resolvedCondition.includes('>')) {
        const [left, right] = resolvedCondition.split('>').map(s => s.trim())
        return parseFloat(left) > parseFloat(right)
      }
      
      if (resolvedCondition.includes('<')) {
        const [left, right] = resolvedCondition.split('<').map(s => s.trim())
        return parseFloat(left) < parseFloat(right)
      }
      
      // Check boolean values
      if (resolvedCondition === 'true') return true
      if (resolvedCondition === 'false') return false
      
      // Check if variable exists and is truthy
      return Boolean(resolvedCondition)
      
    } catch (error) {
      logger.error('Condition evaluation failed', { condition, error: error.message })
      return false
    }
  }

  /**
   * Simple delay utility
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}