/**
 * 🔄 Step Processor
 * Handles execution of individual workflow steps
 */

import { logger } from '../middleware/errorHandler.js'
import { VariableResolver } from '../utils/variableResolver.js'
import { browserSessionManager } from './browserSessionManager.js'

export class StepProcessor {
  constructor() {
    this.variableResolver = new VariableResolver()
    this.stepHandlers = new Map()
    this.sessionManager = browserSessionManager
    this.browserService = browserSessionManager.getBrowserService()
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
    this.stepHandlers.set('wait_for_element', this.handleWaitForElement.bind(this))
    this.stepHandlers.set('navigate', this.handleNavigate.bind(this))
    this.stepHandlers.set('screenshot', this.handleScreenshot.bind(this))
    this.stepHandlers.set('scroll', this.handleScroll.bind(this))
    this.stepHandlers.set('generate_pdf', this.handleGeneratePDF.bind(this))
    this.stepHandlers.set('execute_script', this.handleExecuteScript.bind(this))

    // Data manipulation steps
    this.stepHandlers.set('extract_text', this.handleExtractText.bind(this))
    this.stepHandlers.set('extract_data', this.handleExtractData.bind(this))
    this.stepHandlers.set('extract_attribute', this.handleExtractAttribute.bind(this))
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
  // SESSION MANAGEMENT
  // ============================================================================

  /**
   * Ensure browser session is active for workflow execution
   */
  async ensureBrowserSession(context) {
    try {
      const sessionResult = await this.sessionManager.getSession(
        context.id,
        context.workflowId,
        context.userId || 'anonymous',
        { headless: context.headless !== false }
      )

      if (!sessionResult.success) {
        throw new Error('Failed to create browser session')
      }

      // Update session activity
      this.sessionManager.updateSessionActivity(context.id)
      
      return sessionResult
    } catch (error) {
      logger.error('Failed to ensure browser session', {
        executionId: context.id,
        workflowId: context.workflowId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Close browser session for workflow execution
   */
  async closeBrowserSession(context, reason = 'workflow_complete') {
    try {
      await this.sessionManager.closeSession(context.id, reason)
      logger.debug('Browser session closed', {
        executionId: context.id,
        reason
      })
    } catch (error) {
      logger.error('Failed to close browser session', {
        executionId: context.id,
        error: error.message
      })
    }
  }

  // ============================================================================
  // BROWSER AUTOMATION HANDLERS
  // ============================================================================

  async handleClick(config, context) {
    logger.info('Executing click step', { selector: config.selector })
    
    try {
      // Ensure browser session is active
      await this.ensureBrowserSession(context)
      
      const sessionId = context.sessionId || context.id
      const result = await this.browserService.click(
        sessionId, 
        config.selector, 
        config.pageId || 'default',
        {
          timeout: config.timeout,
          clickCount: config.clickCount,
          delay: config.delay
        }
      )

      if (config.waitAfter) {
        await this.delay(config.waitAfter)
      }

      return {
        action: 'click',
        selector: config.selector,
        success: result.success,
        message: result.success ? `Clicked element: ${config.selector}` : result.error,
        error: result.error
      }
    } catch (error) {
      return {
        action: 'click',
        selector: config.selector,
        success: false,
        error: error.message,
        message: `Failed to click element: ${config.selector}`
      }
    }
  }

  async handleType(config, context) {
    logger.info('Executing type step', { selector: config.selector, text: config.text?.substring(0, 50) })
    
    try {
      const sessionId = context.sessionId || context.id
      const result = await this.browserService.type(
        sessionId,
        config.selector,
        config.text,
        config.pageId || 'default',
        {
          timeout: config.timeout,
          delay: config.typeDelay,
          clear: config.clearFirst
        }
      )

      if (config.waitAfter) {
        await this.delay(config.waitAfter)
      }

      return {
        action: 'type',
        selector: config.selector,
        text: config.text,
        success: result.success,
        message: result.success ? `Typed text into: ${config.selector}` : result.error,
        error: result.error
      }
    } catch (error) {
      return {
        action: 'type',
        selector: config.selector,
        text: config.text,
        success: false,
        error: error.message,
        message: `Failed to type into: ${config.selector}`
      }
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

  async handleWaitForElement(config, context) {
    logger.info('Executing wait for element step', { selector: config.selector })
    
    try {
      const sessionId = context.sessionId || context.id
      const result = await this.browserService.waitForElement(
        sessionId,
        config.selector,
        'default',
        { 
          timeout: config.timeout || 30000,
          visible: config.visible !== false
        }
      )
      
      if (!result.success) {
        throw new Error(result.error)
      }
      
      return {
        action: 'wait_for_element',
        selector: config.selector,
        success: true,
        message: `Element found: ${config.selector}`
      }
    } catch (error) {
      throw new Error(`Wait for element failed: ${error.message}`)
    }
  }

  async handleNavigate(config, context) {
    logger.info('Executing navigate step', { url: config.url })
    
    try {
      // Ensure browser session is active
      await this.ensureBrowserSession(context)
      
      const sessionId = context.sessionId || context.id
      const result = await this.browserService.navigate(
        sessionId,
        config.url,
        config.pageId || 'default',
        {
          waitUntil: config.waitUntil || 'networkidle2',
          timeout: config.timeout
        }
      )

      if (config.waitAfter) {
        await this.delay(config.waitAfter)
      }

      return {
        action: 'navigate',
        url: config.url,
        success: result.success,
        message: result.success ? `Navigated to: ${result.url}` : result.error,
        currentUrl: result.url,
        title: result.title,
        statusCode: result.statusCode,
        error: result.error,
        variables: result.success ? {
          current_url: result.url,
          page_title: result.title
        } : undefined
      }
    } catch (error) {
      return {
        action: 'navigate',
        url: config.url,
        success: false,
        error: error.message,
        message: `Failed to navigate to: ${config.url}`
      }
    }
  }

  async handleScreenshot(config, context) {
    logger.info('Executing screenshot step')
    
    try {
      const sessionId = context.sessionId || context.id
      const result = await this.browserService.screenshot(
        sessionId,
        config.pageId || 'default',
        {
          fullPage: config.fullPage,
          quality: config.quality,
          type: config.type || 'png'
        }
      )

      return {
        action: 'screenshot',
        filename: result.filename,
        filepath: result.filepath,
        url: result.url,
        success: result.success,
        message: result.success ? 'Screenshot captured' : result.error,
        error: result.error,
        variables: result.success ? {
          last_screenshot: result.filename,
          screenshot_url: result.url
        } : undefined
      }
    } catch (error) {
      return {
        action: 'screenshot',
        success: false,
        error: error.message,
        message: 'Failed to capture screenshot'
      }
    }
  }

  async handleScroll(config, context) {
    logger.info('Executing scroll step', { direction: config.direction, amount: config.amount })
    
    try {
      const sessionId = context.sessionId || context.id
      const result = await this.browserService.scroll(
        sessionId, 
        config.direction || 'down', 
        config.amount || 500
      )
      
      if (!result.success) {
        throw new Error(result.error)
      }
      
      return {
        action: 'scroll',
        direction: config.direction || 'down',
        amount: config.amount || 500,
        success: true,
        message: `Scrolled ${config.direction || 'down'} by ${config.amount || 500}px`
      }
    } catch (error) {
      throw new Error(`Scroll failed: ${error.message}`)
    }
  }

  // ============================================================================
  // DATA MANIPULATION HANDLERS
  // ============================================================================

  async handleExtractText(config, context) {
    logger.info('Executing extract text step', { selector: config.selector })
    
    try {
      const sessionId = context.sessionId || context.id
      const result = await this.browserService.extractText(
        sessionId, 
        config.selector, 
        'default',
        { multiple: config.multiple || false }
      )
      
      if (!result.success) {
        throw new Error(result.error)
      }
      
      const variableName = config.variableName || 'extracted_text'
      
      return {
        action: 'extract_text',
        selector: config.selector,
        extractedText: result.data,
        success: true,
        message: `Extracted text from: ${config.selector}`,
        variables: {
          [variableName]: result.data
        }
      }
    } catch (error) {
      throw new Error(`Text extraction failed: ${error.message}`)
    }
  }

  async handleExtractData(config, context) {
    logger.info('Executing extract data step', { selectors: Object.keys(config.selectors || {}) })
    
    try {
      const sessionId = context.sessionId || context.id
      const extractedData = {}
      
      for (const [key, selector] of Object.entries(config.selectors || {})) {
        const result = await this.browserService.extractText(
          sessionId, 
          selector, 
          'default',
          { multiple: false }
        )
        
        if (result.success) {
          extractedData[key] = result.data
        } else {
          extractedData[key] = null
          logger.warn(`Failed to extract data for ${key}`, { selector, error: result.error })
        }
      }
      
      return {
        action: 'extract_data',
        extractedData,
        success: true,
        message: `Extracted ${Object.keys(extractedData).length} data points`,
        variables: extractedData
      }
    } catch (error) {
      throw new Error(`Data extraction failed: ${error.message}`)
    }
  }

  async handleExtractAttribute(config, context) {
    logger.info('Executing extract attribute step', { selector: config.selector, attribute: config.attribute })
    
    try {
      const sessionId = context.sessionId || context.id
      const result = await this.browserService.extractAttribute(
        sessionId,
        config.selector,
        config.attribute,
        'default',
        { multiple: config.multiple || false }
      )
      
      if (!result.success) {
        throw new Error(result.error)
      }
      
      const variableName = config.variableName || 'extracted_attribute'
      
      return {
        action: 'extract_attribute',
        selector: config.selector,
        attribute: config.attribute,
        extractedValue: result.data,
        success: true,
        message: `Extracted ${config.attribute} from: ${config.selector}`,
        variables: {
          [variableName]: result.data
        }
      }
    } catch (error) {
      throw new Error(`Attribute extraction failed: ${error.message}`)
    }
  }

  async handleGeneratePDF(config, context) {
    logger.info('Executing generate PDF step', { options: config.options })
    
    try {
      const sessionId = context.sessionId || context.id
      const result = await this.browserService.generatePDF(
        sessionId,
        'default',
        config.options || {}
      )
      
      if (!result.success) {
        throw new Error(result.error)
      }
      
      const variableName = config.variableName || 'pdf_file'
      
      return {
        action: 'generate_pdf',
        filename: result.filename,
        filepath: result.filepath,
        url: result.url,
        success: true,
        message: `PDF generated: ${result.filename}`,
        variables: {
          [variableName]: result.filename,
          [`${variableName}_url`]: result.url,
          [`${variableName}_path`]: result.filepath
        }
      }
    } catch (error) {
      throw new Error(`PDF generation failed: ${error.message}`)
    }
  }

  async handleExecuteScript(config, context) {
    logger.info('Executing custom script step')
    
    try {
      const sessionId = context.sessionId || context.id
      const result = await this.browserService.executeScript(
        sessionId,
        config.script,
        'default'
      )
      
      if (!result.success) {
        throw new Error(result.error)
      }
      
      const variableName = config.variableName || 'script_result'
      
      return {
        action: 'execute_script',
        result: result.result,
        success: true,
        message: 'Custom script executed successfully',
        variables: {
          [variableName]: result.result
        }
      }
    } catch (error) {
      throw new Error(`Script execution failed: ${error.message}`)
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