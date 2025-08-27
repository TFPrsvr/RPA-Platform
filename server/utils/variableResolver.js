/**
 * 🔄 Variable Resolver
 * Resolves variables and expressions in workflow configurations
 */

export class VariableResolver {
  constructor() {
    this.variablePattern = /\{\{(.+?)\}\}/g
  }

  /**
   * Resolve variables in a value (string, object, or array)
   */
  resolveVariables(value, variables = {}) {
    if (typeof value === 'string') {
      return this.resolveStringVariables(value, variables)
    }
    
    if (Array.isArray(value)) {
      return value.map(item => this.resolveVariables(item, variables))
    }
    
    if (value && typeof value === 'object') {
      const resolved = {}
      for (const [key, val] of Object.entries(value)) {
        resolved[key] = this.resolveVariables(val, variables)
      }
      return resolved
    }
    
    return value
  }

  /**
   * Resolve variables in a string
   */
  resolveStringVariables(str, variables = {}) {
    if (typeof str !== 'string') {
      return str
    }

    return str.replace(this.variablePattern, (match, expression) => {
      try {
        return this.evaluateExpression(expression.trim(), variables)
      } catch (error) {
        // Return original if resolution fails
        return match
      }
    })
  }

  /**
   * Evaluate an expression with variables
   */
  evaluateExpression(expression, variables = {}) {
    // Handle simple variable access
    if (variables.hasOwnProperty(expression)) {
      return variables[expression]
    }

    // Handle dot notation (e.g., user.name)
    if (expression.includes('.')) {
      return this.getNestedValue(variables, expression)
    }

    // Handle array access (e.g., items[0])
    if (expression.includes('[') && expression.includes(']')) {
      return this.getArrayValue(variables, expression)
    }

    // Handle function calls (e.g., date(), random())
    if (expression.includes('(') && expression.includes(')')) {
      return this.callFunction(expression, variables)
    }

    // Handle mathematical expressions (basic)
    if (this.isMathExpression(expression)) {
      return this.evaluateMathExpression(expression, variables)
    }

    // Return as-is if no variable found
    return expression
  }

  /**
   * Get nested object value using dot notation
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined
    }, obj)
  }

  /**
   * Get array value using bracket notation
   */
  getArrayValue(variables, expression) {
    const match = expression.match(/^(\w+)\[(\d+)\]$/)
    if (match) {
      const [, arrayName, index] = match
      const array = variables[arrayName]
      return Array.isArray(array) ? array[parseInt(index)] : undefined
    }
    return undefined
  }

  /**
   * Call built-in functions
   */
  callFunction(expression, variables) {
    const match = expression.match(/^(\w+)\((.*?)\)$/)
    if (!match) {
      return expression
    }

    const [, functionName, argsStr] = match
    const args = argsStr ? argsStr.split(',').map(arg => arg.trim()) : []

    switch (functionName.toLowerCase()) {
      case 'date':
        return this.dateFunction(args)
      
      case 'random':
        return this.randomFunction(args)
      
      case 'uuid':
        return this.uuidFunction()
      
      case 'length':
        return this.lengthFunction(args[0], variables)
      
      case 'substring':
        return this.substringFunction(args, variables)
      
      case 'replace':
        return this.replaceFunction(args, variables)
      
      case 'uppercase':
        return this.uppercaseFunction(args[0], variables)
      
      case 'lowercase':
        return this.lowercaseFunction(args[0], variables)
      
      case 'trim':
        return this.trimFunction(args[0], variables)
      
      case 'format':
        return this.formatFunction(args, variables)
      
      default:
        return expression
    }
  }

  /**
   * Check if expression is a mathematical expression
   */
  isMathExpression(expression) {
    return /^[\d\s+\-*/().]+$/.test(expression) && /[+\-*/]/.test(expression)
  }

  /**
   * Evaluate basic mathematical expressions
   */
  evaluateMathExpression(expression, variables) {
    try {
      // Replace variables in math expression
      let resolved = expression
      for (const [key, value] of Object.entries(variables)) {
        if (typeof value === 'number') {
          resolved = resolved.replace(new RegExp(`\\b${key}\\b`, 'g'), value.toString())
        }
      }

      // Basic math evaluation (unsafe for production without proper sandboxing)
      return Function(`"use strict"; return (${resolved})`)()
    } catch (error) {
      return expression
    }
  }

  // ============================================================================
  // BUILT-IN FUNCTIONS
  // ============================================================================

  /**
   * Date function - returns current date/time or formatted date
   */
  dateFunction(args) {
    const format = args[0] || 'iso'
    const date = new Date()

    switch (format.toLowerCase()) {
      case 'iso':
        return date.toISOString()
      case 'date':
        return date.toDateString()
      case 'time':
        return date.toTimeString()
      case 'timestamp':
        return date.getTime()
      case 'year':
        return date.getFullYear()
      case 'month':
        return date.getMonth() + 1
      case 'day':
        return date.getDate()
      default:
        // Try to use format as toLocaleDateString options
        try {
          return date.toLocaleDateString('en-US', { format })
        } catch {
          return date.toISOString()
        }
    }
  }

  /**
   * Random function - generates random numbers
   */
  randomFunction(args) {
    if (args.length === 0) {
      return Math.random()
    }
    
    if (args.length === 1) {
      return Math.floor(Math.random() * parseInt(args[0]))
    }
    
    if (args.length === 2) {
      const min = parseInt(args[0])
      const max = parseInt(args[1])
      return Math.floor(Math.random() * (max - min + 1)) + min
    }
    
    return Math.random()
  }

  /**
   * UUID function - generates a simple UUID
   */
  uuidFunction() {
    return 'xxxx-xxxx-4xxx-yxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0
      const v = c === 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    })
  }

  /**
   * Length function - gets length of string or array
   */
  lengthFunction(variable, variables) {
    const value = variables[variable] || variable
    
    if (typeof value === 'string' || Array.isArray(value)) {
      return value.length
    }
    
    if (value && typeof value === 'object') {
      return Object.keys(value).length
    }
    
    return 0
  }

  /**
   * Substring function - extracts substring
   */
  substringFunction(args, variables) {
    if (args.length < 2) return ''
    
    const variable = args[0]
    const start = parseInt(args[1])
    const end = args[2] ? parseInt(args[2]) : undefined
    
    const value = variables[variable] || variable
    
    if (typeof value === 'string') {
      return end !== undefined ? value.substring(start, end) : value.substring(start)
    }
    
    return ''
  }

  /**
   * Replace function - replaces text in string
   */
  replaceFunction(args, variables) {
    if (args.length < 3) return ''
    
    const variable = args[0]
    const search = args[1]
    const replacement = args[2]
    
    const value = variables[variable] || variable
    
    if (typeof value === 'string') {
      return value.replace(new RegExp(search, 'g'), replacement)
    }
    
    return value
  }

  /**
   * Uppercase function
   */
  uppercaseFunction(variable, variables) {
    const value = variables[variable] || variable
    return typeof value === 'string' ? value.toUpperCase() : value
  }

  /**
   * Lowercase function
   */
  lowercaseFunction(variable, variables) {
    const value = variables[variable] || variable
    return typeof value === 'string' ? value.toLowerCase() : value
  }

  /**
   * Trim function
   */
  trimFunction(variable, variables) {
    const value = variables[variable] || variable
    return typeof value === 'string' ? value.trim() : value
  }

  /**
   * Format function - basic string formatting
   */
  formatFunction(args, variables) {
    if (args.length === 0) return ''
    
    let template = variables[args[0]] || args[0]
    
    // Replace {0}, {1}, etc. with arguments
    for (let i = 1; i < args.length; i++) {
      const value = variables[args[i]] || args[i]
      template = template.replace(new RegExp(`\\{${i-1}\\}`, 'g'), value)
    }
    
    return template
  }

  /**
   * Get all variable references in a string
   */
  getVariableReferences(str) {
    if (typeof str !== 'string') {
      return []
    }

    const matches = []
    let match

    while ((match = this.variablePattern.exec(str)) !== null) {
      matches.push(match[1].trim())
    }

    return [...new Set(matches)] // Remove duplicates
  }

  /**
   * Check if string contains variables
   */
  hasVariables(str) {
    return typeof str === 'string' && this.variablePattern.test(str)
  }

  /**
   * Validate that all variables in expression exist
   */
  validateVariables(expression, availableVariables = {}) {
    const references = this.getVariableReferences(expression)
    const missing = references.filter(ref => {
      // Check simple variable name
      if (availableVariables.hasOwnProperty(ref)) {
        return false
      }
      
      // Check dot notation
      if (ref.includes('.')) {
        return this.getNestedValue(availableVariables, ref) === undefined
      }
      
      return true
    })

    return {
      valid: missing.length === 0,
      missingVariables: missing,
      referencedVariables: references
    }
  }
}