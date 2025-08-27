import { NODE_TYPES, EXECUTION_STATUS } from '../constants/workflowTypes.js'

export class WorkflowExecutor {
  constructor(workflow) {
    this.workflow = workflow
    this.executionContext = {
      variables: {},
      currentNode: null,
      startTime: null,
      endTime: null,
      executionLog: []
    }
    this.isRunning = false
    this.isPaused = false
    this.shouldStop = false
  }

  async execute() {
    if (this.isRunning) {
      throw new Error('Workflow is already running')
    }

    try {
      this.isRunning = true
      this.shouldStop = false
      this.executionContext.startTime = new Date().toISOString()
      this.executionContext.variables = { ...this.workflow.variables }
      
      this.log('Workflow execution started', 'info')

      // Validate workflow before execution
      const validation = this.workflow.validate()
      if (!validation.isValid) {
        throw new Error(`Workflow validation failed: ${validation.errors.join(', ')}`)
      }

      // Reset all node execution statuses
      this.resetNodeStatuses()

      // Get execution order
      const executionOrder = this.workflow.getExecutionOrder()
      if (executionOrder.length === 0) {
        throw new Error('No executable nodes found in workflow')
      }

      this.log(`Executing ${executionOrder.length} nodes`, 'info')

      // Execute nodes in order
      for (const nodeId of executionOrder) {
        if (this.shouldStop) {
          this.log('Execution stopped by user', 'warning')
          break
        }

        if (this.isPaused) {
          this.log('Execution paused', 'info')
          await this.waitForResume()
        }

        const node = this.workflow.getNode(nodeId)
        if (node && node.canExecute()) {
          await this.executeNode(node)
        }
      }

      this.executionContext.endTime = new Date().toISOString()
      this.log('Workflow execution completed', 'success')
      
      return {
        success: true,
        executionLog: this.executionContext.executionLog,
        variables: this.executionContext.variables,
        duration: this.getExecutionDuration()
      }

    } catch (error) {
      this.executionContext.endTime = new Date().toISOString()
      this.log(`Workflow execution failed: ${error.message}`, 'error')
      
      return {
        success: false,
        error: error.message,
        executionLog: this.executionContext.executionLog,
        variables: this.executionContext.variables,
        duration: this.getExecutionDuration()
      }
    } finally {
      this.isRunning = false
      this.isPaused = false
    }
  }

  async executeNode(node) {
    this.executionContext.currentNode = node.id
    node.updateExecutionStatus(EXECUTION_STATUS.RUNNING)
    
    this.log(`Executing node: ${node.type} (${node.id})`, 'info')

    try {
      const result = await this.executeNodeByType(node)
      
      node.updateExecutionStatus(EXECUTION_STATUS.SUCCESS, result)
      this.log(`Node completed successfully: ${node.id}`, 'success')
      
      return result
    } catch (error) {
      node.updateExecutionStatus(EXECUTION_STATUS.ERROR, { error: error.message })
      this.log(`Node failed: ${node.id} - ${error.message}`, 'error')
      
      // Decide whether to continue or stop execution
      if (this.shouldStopOnError(node)) {
        throw error
      }
      
      return null
    }
  }

  async executeNodeByType(node) {
    switch (node.type) {
      case NODE_TYPES.START:
        return await this.executeStartNode(node)
      case NODE_TYPES.END:
        return await this.executeEndNode(node)
      case NODE_TYPES.WAIT:
        return await this.executeWaitNode(node)
      case NODE_TYPES.NAVIGATE:
        return await this.executeNavigateNode(node)
      case NODE_TYPES.CLICK:
        return await this.executeClickNode(node)
      case NODE_TYPES.INPUT:
        return await this.executeInputNode(node)
      case NODE_TYPES.CONDITION:
        return await this.executeConditionNode(node)
      case NODE_TYPES.LOOP:
        return await this.executeLoopNode(node)
      case NODE_TYPES.EXTRACT:
        return await this.executeExtractNode(node)
      case NODE_TYPES.SCROLL:
        return await this.executeScrollNode(node)
      default:
        throw new Error(`Unknown node type: ${node.type}`)
    }
  }

  // Node execution implementations
  async executeStartNode(_node) {
    return { message: 'Workflow started' }
  }

  async executeEndNode(node) {
    const message = node.config.message || 'Workflow completed'
    this.log(message, 'info')
    return { message }
  }

  async executeWaitNode(node) {
    const duration = node.config.duration || 3
    const reason = node.config.reason || `Waiting for ${duration} seconds`
    
    this.log(`Waiting: ${reason}`, 'info')
    await this.delay(duration * 1000)
    
    return { duration, reason }
  }

  async executeNavigateNode(node) {
    const url = node.config.url
    if (!url) {
      throw new Error('Navigate node requires a URL')
    }

    this.log(`Navigating to: ${url}`, 'info')
    
    // In a real implementation, this would control a browser
    // For now, we'll simulate the navigation
    await this.delay(1000) // Simulate navigation time
    
    return { url, action: 'navigated' }
  }

  async executeClickNode(node) {
    const selector = node.config.selector
    const selectorType = node.config.selectorType || 'text'
    const waitAfter = node.config.waitAfter || 1
    
    if (!selector) {
      throw new Error('Click node requires a selector')
    }

    this.log(`Clicking element: ${selector} (${selectorType})`, 'info')
    
    // Simulate click action
    await this.delay(500)
    
    if (waitAfter > 0) {
      await this.delay(waitAfter * 1000)
    }
    
    return { selector, selectorType, action: 'clicked' }
  }

  async executeInputNode(node) {
    const selector = node.config.selector
    const text = node.config.text
    const clearFirst = node.config.clearFirst !== false
    
    if (!selector || !text) {
      throw new Error('Input node requires both selector and text')
    }

    this.log(`Entering text in field: ${selector}`, 'info')
    
    // Simulate input action
    await this.delay(500)
    
    return { selector, text, clearFirst, action: 'input' }
  }

  async executeConditionNode(node) {
    const conditionType = node.config.conditionType
    const value = node.config.value
    
    if (!conditionType || !value) {
      throw new Error('Condition node requires conditionType and value')
    }

    this.log(`Checking condition: ${conditionType} = ${value}`, 'info')
    
    // Simulate condition check
    await this.delay(200)
    
    // For demo purposes, randomly return true/false
    const result = Math.random() > 0.5
    
    this.log(`Condition result: ${result}`, 'info')
    
    return { conditionType, value, result, action: 'condition_checked' }
  }

  async executeLoopNode(node) {
    const loopType = node.config.loopType || 'count'
    const iterations = node.config.iterations || 3
    
    this.log(`Starting loop: ${loopType}, iterations: ${iterations}`, 'info')
    
    // In a real implementation, this would control loop flow
    // For now, we'll just log the loop configuration
    
    return { loopType, iterations, action: 'loop_configured' }
  }

  async executeExtractNode(node) {
    const selector = node.config.selector
    const attribute = node.config.attribute || 'text'
    const variableName = node.config.variableName
    
    if (!selector || !variableName) {
      throw new Error('Extract node requires selector and variableName')
    }

    this.log(`Extracting ${attribute} from: ${selector}`, 'info')
    
    // Simulate data extraction
    const extractedValue = `Extracted value for ${selector}`
    this.executionContext.variables[variableName] = extractedValue
    
    return { selector, attribute, variableName, extractedValue, action: 'extracted' }
  }

  async executeScrollNode(node) {
    const scrollType = node.config.scrollType || 'toBottom'
    const target = node.config.target
    const pixels = node.config.pixels || 500
    
    this.log(`Scrolling: ${scrollType}`, 'info')
    
    // Simulate scroll action
    await this.delay(300)
    
    return { scrollType, target, pixels, action: 'scrolled' }
  }

  // Utility methods
  resetNodeStatuses() {
    this.workflow.nodes.forEach(node => {
      node.updateExecutionStatus(EXECUTION_STATUS.PENDING)
    })
  }

  shouldStopOnError(node) {
    // For now, stop on any error
    // In the future, this could be configurable per node
    return true
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  async waitForResume() {
    return new Promise(resolve => {
      const checkResume = () => {
        if (!this.isPaused || this.shouldStop) {
          resolve()
        } else {
          setTimeout(checkResume, 100)
        }
      }
      checkResume()
    })
  }

  log(message, level = 'info') {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      nodeId: this.executionContext.currentNode
    }
    
    this.executionContext.executionLog.push(logEntry)
    console.log(`[${level.toUpperCase()}] ${message}`)
  }

  getExecutionDuration() {
    if (!this.executionContext.startTime || !this.executionContext.endTime) {
      return null
    }
    
    const start = new Date(this.executionContext.startTime)
    const end = new Date(this.executionContext.endTime)
    return end - start
  }

  // Control methods
  pause() {
    if (this.isRunning) {
      this.isPaused = true
      this.log('Execution paused by user', 'warning')
    }
  }

  resume() {
    if (this.isRunning && this.isPaused) {
      this.isPaused = false
      this.log('Execution resumed by user', 'info')
    }
  }

  stop() {
    this.shouldStop = true
    this.isPaused = false
    this.log('Stop requested by user', 'warning')
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      currentNode: this.executionContext.currentNode,
      executionLog: this.executionContext.executionLog,
      variables: this.executionContext.variables
    }
  }
}