import { NODE_TYPES, WORKFLOW_STATUS, EXECUTION_STATUS } from '../constants/workflowTypes.js'

export class WorkflowNode {
  constructor(id, type, position = { x: 0, y: 0 }) {
    this.id = id || `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    this.type = type
    this.position = position
    this.config = {}
    this.connections = {
      inputs: [],  // Array of { nodeId, outputPort }
      outputs: []  // Array of { nodeId, inputPort, outputPort }
    }
    this.executionStatus = EXECUTION_STATUS.PENDING
    this.executionResult = null
    this.executionTime = null
    this.retryCount = 0
    this.metadata = {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  }

  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig }
    this.metadata.updatedAt = new Date().toISOString()
  }

  addConnection(targetNodeId, outputPort = 'success', inputPort = 'trigger') {
    const connection = { nodeId: targetNodeId, inputPort, outputPort }
    if (!this.connections.outputs.find(c => 
      c.nodeId === targetNodeId && 
      c.outputPort === outputPort && 
      c.inputPort === inputPort
    )) {
      this.connections.outputs.push(connection)
    }
  }

  removeConnection(targetNodeId, outputPort = 'success') {
    this.connections.outputs = this.connections.outputs.filter(c => 
      !(c.nodeId === targetNodeId && c.outputPort === outputPort)
    )
  }

  updateExecutionStatus(status, result = null) {
    this.executionStatus = status
    this.executionResult = result
    this.executionTime = new Date().toISOString()
    
    if (status === EXECUTION_STATUS.ERROR) {
      this.retryCount += 1
    }
  }

  canExecute() {
    // A node can execute if all its required inputs are satisfied
    return this.executionStatus === EXECUTION_STATUS.PENDING || 
           this.executionStatus === EXECUTION_STATUS.ERROR
  }

  validate() {
    const errors = []
    
    // Basic validation
    if (!this.type) {
      errors.push('Node type is required')
    }
    
    if (!this.position) {
      errors.push('Node position is required')
    }

    // Type-specific validation would go here
    // This could reference the configSchema from workflowTypes.js
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }
}

export class WorkflowModel {
  constructor(data = {}) {
    this.id = data.id || null
    this.name = data.name || 'New Workflow'
    this.description = data.description || ''
    this.status = data.status || WORKFLOW_STATUS.DRAFT
    this.nodes = new Map()
    this.metadata = {
      createdAt: data.created_at || new Date().toISOString(),
      updatedAt: data.updated_at || new Date().toISOString(),
      version: data.version || 1,
      userId: data.user_id || null,
      organizationId: data.organization_id || null
    }
    this.executionHistory = data.execution_history || []
    this.variables = data.variables || {}
    
    // Initialize nodes from data
    if (data.steps && Array.isArray(data.steps)) {
      data.steps.forEach(step => {
        const node = new WorkflowNode(step.id, step.type, step.position)
        node.config = step.config || {}
        node.connections = step.connections || { inputs: [], outputs: [] }
        this.nodes.set(node.id, node)
      })
    }
  }

  addNode(type, position) {
    const node = new WorkflowNode(null, type, position)
    this.nodes.set(node.id, node)
    this.updateTimestamp()
    return node
  }

  removeNode(nodeId) {
    // Remove all connections to/from this node
    this.nodes.forEach(node => {
      // Remove outgoing connections
      node.connections.outputs = node.connections.outputs.filter(
        conn => conn.nodeId !== nodeId
      )
      // Remove incoming connections  
      node.connections.inputs = node.connections.inputs.filter(
        conn => conn.nodeId !== nodeId
      )
    })
    
    const removed = this.nodes.delete(nodeId)
    if (removed) {
      this.updateTimestamp()
    }
    return removed
  }

  getNode(nodeId) {
    return this.nodes.get(nodeId)
  }

  updateNode(nodeId, updates) {
    const node = this.nodes.get(nodeId)
    if (node) {
      Object.assign(node, updates)
      node.metadata.updatedAt = new Date().toISOString()
      this.updateTimestamp()
      return node
    }
    return null
  }

  connectNodes(fromNodeId, toNodeId, outputPort = 'success', inputPort = 'trigger') {
    const fromNode = this.nodes.get(fromNodeId)
    const toNode = this.nodes.get(toNodeId)
    
    if (fromNode && toNode) {
      fromNode.addConnection(toNodeId, outputPort, inputPort)
      
      // Add reverse connection for quick lookup
      const inputConnection = { nodeId: fromNodeId, outputPort }
      if (!toNode.connections.inputs.find(c => 
        c.nodeId === fromNodeId && c.outputPort === outputPort
      )) {
        toNode.connections.inputs.push(inputConnection)
      }
      
      this.updateTimestamp()
      return true
    }
    return false
  }

  disconnectNodes(fromNodeId, toNodeId, outputPort = 'success') {
    const fromNode = this.nodes.get(fromNodeId)
    const toNode = this.nodes.get(toNodeId)
    
    if (fromNode && toNode) {
      fromNode.removeConnection(toNodeId, outputPort)
      toNode.connections.inputs = toNode.connections.inputs.filter(c => 
        !(c.nodeId === fromNodeId && c.outputPort === outputPort)
      )
      
      this.updateTimestamp()
      return true
    }
    return false
  }

  getExecutionOrder() {
    const visited = new Set()
    const executionOrder = []
    
    // Find starting nodes (nodes with no inputs or START type)
    const startNodes = Array.from(this.nodes.values()).filter(node => 
      node.type === NODE_TYPES.START || node.connections.inputs.length === 0
    )
    
    // Depth-first traversal
    const traverse = (node) => {
      if (visited.has(node.id)) return
      
      visited.add(node.id)
      executionOrder.push(node.id)
      
      // Add connected nodes
      node.connections.outputs.forEach(connection => {
        const connectedNode = this.nodes.get(connection.nodeId)
        if (connectedNode) {
          traverse(connectedNode)
        }
      })
    }
    
    startNodes.forEach(traverse)
    
    return executionOrder
  }

  validate() {
    const errors = []
    const warnings = []
    
    // Basic workflow validation
    if (!this.name.trim()) {
      errors.push('Workflow name is required')
    }
    
    if (this.nodes.size === 0) {
      warnings.push('Workflow has no steps')
    }
    
    // Validate individual nodes
    this.nodes.forEach(node => {
      const nodeValidation = node.validate()
      if (!nodeValidation.isValid) {
        errors.push(`Node ${node.id}: ${nodeValidation.errors.join(', ')}`)
      }
    })
    
    // Check for orphaned nodes (nodes with no connections)
    const connectedNodes = new Set()
    this.nodes.forEach(node => {
      node.connections.outputs.forEach(conn => connectedNodes.add(conn.nodeId))
      node.connections.inputs.forEach(conn => connectedNodes.add(conn.nodeId))
      if (node.connections.inputs.length > 0 || node.connections.outputs.length > 0) {
        connectedNodes.add(node.id)
      }
    })
    
    const orphanedNodes = Array.from(this.nodes.keys()).filter(
      nodeId => !connectedNodes.has(nodeId) && this.nodes.get(nodeId).type !== NODE_TYPES.START
    )
    
    if (orphanedNodes.length > 0) {
      warnings.push(`Orphaned nodes: ${orphanedNodes.join(', ')}`)
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  updateTimestamp() {
    this.metadata.updatedAt = new Date().toISOString()
    this.metadata.version += 1
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      status: this.status,
      steps: Array.from(this.nodes.values()).map(node => ({
        id: node.id,
        type: node.type,
        position: node.position,
        config: node.config,
        connections: node.connections
      })),
      variables: this.variables,
      created_at: this.metadata.createdAt,
      updated_at: this.metadata.updatedAt,
      version: this.metadata.version,
      user_id: this.metadata.userId,
      organization_id: this.metadata.organizationId
    }
  }

  static fromJSON(data) {
    return new WorkflowModel(data)
  }
}