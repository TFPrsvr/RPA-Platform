/**
 * 🔄 WebSocket Service
 * Real-time updates for workflow execution status
 */

import { WebSocketServer } from 'ws'
import { logger } from '../middleware/errorHandler.js'

export class WebSocketService {
  constructor(server, workflowEngine, workflowScheduler) {
    this.server = server
    this.workflowEngine = workflowEngine
    this.workflowScheduler = workflowScheduler
    this.clients = new Map()
    this.rooms = new Map() // Group clients by workflow/organization
    
    this.initializeWebSocketServer()
    this.setupEngineEventListeners()
  }

  /**
   * Initialize WebSocket server
   */
  initializeWebSocketServer() {
    this.wss = new WebSocketServer({ 
      server: this.server,
      path: '/ws'
    })

    this.wss.on('connection', (ws, req) => {
      this.handleConnection(ws, req)
    })

    logger.info('WebSocket server initialized', { path: '/ws' })
  }

  /**
   * Handle new WebSocket connection
   */
  handleConnection(ws, req) {
    const clientId = this.generateClientId()
    const clientInfo = {
      id: clientId,
      ws,
      userId: null,
      organizationId: null,
      subscriptions: new Set(),
      lastPing: Date.now()
    }

    this.clients.set(clientId, clientInfo)
    
    logger.debug('WebSocket client connected', { clientId })

    // Set up message handlers
    ws.on('message', (message) => {
      this.handleMessage(clientId, message)
    })

    ws.on('close', () => {
      this.handleDisconnection(clientId)
    })

    ws.on('error', (error) => {
      logger.error('WebSocket client error', { clientId, error: error.message })
      this.handleDisconnection(clientId)
    })

    // Set up ping/pong for connection health
    ws.on('pong', () => {
      const client = this.clients.get(clientId)
      if (client) {
        client.lastPing = Date.now()
      }
    })

    // Send welcome message
    this.sendToClient(clientId, {
      type: 'welcome',
      clientId,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Handle incoming WebSocket messages
   */
  handleMessage(clientId, rawMessage) {
    try {
      const message = JSON.parse(rawMessage)
      const client = this.clients.get(clientId)

      if (!client) {
        return
      }

      switch (message.type) {
        case 'authenticate':
          this.handleAuthentication(clientId, message)
          break

        case 'subscribe':
          this.handleSubscription(clientId, message)
          break

        case 'unsubscribe':
          this.handleUnsubscription(clientId, message)
          break

        case 'ping':
          this.sendToClient(clientId, { type: 'pong', timestamp: Date.now() })
          break

        default:
          logger.warn('Unknown WebSocket message type', { clientId, type: message.type })
      }
    } catch (error) {
      logger.error('Error handling WebSocket message', { 
        clientId, 
        error: error.message 
      })
      this.sendToClient(clientId, {
        type: 'error',
        message: 'Invalid message format'
      })
    }
  }

  /**
   * Handle client authentication
   */
  handleAuthentication(clientId, message) {
    const client = this.clients.get(clientId)
    if (!client) return

    // In production, verify JWT token here
    // For now, accept user ID from message
    client.userId = message.userId
    client.organizationId = message.organizationId

    logger.debug('WebSocket client authenticated', { 
      clientId, 
      userId: client.userId,
      organizationId: client.organizationId
    })

    this.sendToClient(clientId, {
      type: 'authenticated',
      userId: client.userId,
      organizationId: client.organizationId
    })
  }

  /**
   * Handle subscription requests
   */
  handleSubscription(clientId, message) {
    const client = this.clients.get(clientId)
    if (!client || !client.userId) {
      this.sendToClient(clientId, {
        type: 'error',
        message: 'Authentication required'
      })
      return
    }

    const { channel, resourceId } = message

    // Validate subscription permissions
    if (!this.validateSubscription(client, channel, resourceId)) {
      this.sendToClient(clientId, {
        type: 'error',
        message: 'Permission denied'
      })
      return
    }

    const subscription = `${channel}:${resourceId}`
    client.subscriptions.add(subscription)

    // Add client to room
    this.addToRoom(subscription, clientId)

    logger.debug('Client subscribed', { clientId, subscription })

    this.sendToClient(clientId, {
      type: 'subscribed',
      channel,
      resourceId,
      subscription
    })

    // Send current status for workflow subscriptions
    if (channel === 'workflow-execution' || channel === 'workflow-status') {
      this.sendCurrentWorkflowStatus(clientId, resourceId)
    }
  }

  /**
   * Handle unsubscription requests
   */
  handleUnsubscription(clientId, message) {
    const client = this.clients.get(clientId)
    if (!client) return

    const { channel, resourceId } = message
    const subscription = `${channel}:${resourceId}`
    
    client.subscriptions.delete(subscription)
    this.removeFromRoom(subscription, clientId)

    logger.debug('Client unsubscribed', { clientId, subscription })

    this.sendToClient(clientId, {
      type: 'unsubscribed',
      channel,
      resourceId
    })
  }

  /**
   * Handle client disconnection
   */
  handleDisconnection(clientId) {
    const client = this.clients.get(clientId)
    if (!client) return

    logger.debug('WebSocket client disconnected', { clientId })

    // Remove from all rooms
    for (const subscription of client.subscriptions) {
      this.removeFromRoom(subscription, clientId)
    }

    // Remove client
    this.clients.delete(clientId)
  }

  /**
   * Validate subscription permissions
   */
  validateSubscription(client, channel, resourceId) {
    // Basic validation - in production, implement proper permission checks
    switch (channel) {
      case 'workflow-execution':
      case 'workflow-status':
      case 'workflow-logs':
        return true // User owns workflow or has org access

      case 'organization-activity':
        return client.organizationId === resourceId

      case 'user-notifications':
        return client.userId === resourceId

      default:
        return false
    }
  }

  /**
   * Set up workflow engine event listeners
   */
  setupEngineEventListeners() {
    // Execution lifecycle events
    this.workflowEngine.on('executionStarted', (context) => {
      this.broadcastToRoom(`workflow-execution:${context.workflowId}`, {
        type: 'execution-started',
        executionId: context.id,
        workflowId: context.workflowId,
        workflowName: context.workflow.name,
        userId: context.userId,
        timestamp: new Date().toISOString()
      })
    })

    this.workflowEngine.on('executionCompleted', (context) => {
      this.broadcastToRoom(`workflow-execution:${context.workflowId}`, {
        type: 'execution-completed',
        executionId: context.id,
        workflowId: context.workflowId,
        duration: context.duration,
        stepsCompleted: context.stepResults.filter(r => r.success).length,
        timestamp: new Date().toISOString()
      })
    })

    this.workflowEngine.on('executionFailed', ({ context, error }) => {
      this.broadcastToRoom(`workflow-execution:${context.workflowId}`, {
        type: 'execution-failed',
        executionId: context.id,
        workflowId: context.workflowId,
        error: error.message,
        duration: context.duration,
        timestamp: new Date().toISOString()
      })
    })

    this.workflowEngine.on('executionCancelled', ({ context, reason }) => {
      this.broadcastToRoom(`workflow-execution:${context.workflowId}`, {
        type: 'execution-cancelled',
        executionId: context.id,
        workflowId: context.workflowId,
        reason,
        timestamp: new Date().toISOString()
      })
    })

    // Step-level events
    this.workflowEngine.on('stepStarted', ({ context, step, stepIndex }) => {
      this.broadcastToRoom(`workflow-execution:${context.workflowId}`, {
        type: 'step-started',
        executionId: context.id,
        stepIndex,
        stepId: step.id,
        stepType: step.type,
        timestamp: new Date().toISOString()
      })
    })

    this.workflowEngine.on('stepCompleted', ({ context, step, stepIndex, result }) => {
      this.broadcastToRoom(`workflow-execution:${context.workflowId}`, {
        type: 'step-completed',
        executionId: context.id,
        stepIndex,
        stepId: step.id,
        stepType: step.type,
        executionTime: result.executionTime,
        timestamp: new Date().toISOString()
      })
    })

    this.workflowEngine.on('stepFailed', ({ context, step, stepIndex, error }) => {
      this.broadcastToRoom(`workflow-execution:${context.workflowId}`, {
        type: 'step-failed',
        executionId: context.id,
        stepIndex,
        stepId: step.id,
        stepType: step.type,
        error: error.message,
        timestamp: new Date().toISOString()
      })
    })

    // Scheduler events
    this.workflowScheduler.on('jobExecuted', ({ job, execution }) => {
      this.broadcastToRoom(`workflow-status:${job.id}`, {
        type: 'scheduled-execution',
        workflowId: job.id,
        executionId: execution.id,
        scheduledAt: new Date().toISOString()
      })
    })

    logger.info('WebSocket event listeners configured')
  }

  /**
   * Send current workflow status to client
   */
  sendCurrentWorkflowStatus(clientId, workflowId) {
    const activeExecutions = this.workflowEngine.getActiveExecutions()
    const workflowExecutions = activeExecutions.filter(exec => exec.workflowId === workflowId)

    if (workflowExecutions.length > 0) {
      this.sendToClient(clientId, {
        type: 'workflow-status',
        workflowId,
        activeExecutions: workflowExecutions,
        timestamp: new Date().toISOString()
      })
    }
  }

  /**
   * Add client to a room
   */
  addToRoom(roomName, clientId) {
    if (!this.rooms.has(roomName)) {
      this.rooms.set(roomName, new Set())
    }
    this.rooms.get(roomName).add(clientId)
  }

  /**
   * Remove client from a room
   */
  removeFromRoom(roomName, clientId) {
    const room = this.rooms.get(roomName)
    if (room) {
      room.delete(clientId)
      if (room.size === 0) {
        this.rooms.delete(roomName)
      }
    }
  }

  /**
   * Broadcast message to all clients in a room
   */
  broadcastToRoom(roomName, message) {
    const room = this.rooms.get(roomName)
    if (!room) return

    const deadClients = []

    for (const clientId of room) {
      const client = this.clients.get(clientId)
      if (client && client.ws.readyState === 1) { // WebSocket.OPEN
        try {
          client.ws.send(JSON.stringify(message))
        } catch (error) {
          logger.error('Error sending to WebSocket client', { clientId, error: error.message })
          deadClients.push(clientId)
        }
      } else {
        deadClients.push(clientId)
      }
    }

    // Clean up dead clients
    deadClients.forEach(clientId => {
      this.handleDisconnection(clientId)
    })
  }

  /**
   * Send message to specific client
   */
  sendToClient(clientId, message) {
    const client = this.clients.get(clientId)
    if (client && client.ws.readyState === 1) {
      try {
        client.ws.send(JSON.stringify(message))
      } catch (error) {
        logger.error('Error sending to WebSocket client', { clientId, error: error.message })
        this.handleDisconnection(clientId)
      }
    }
  }

  /**
   * Generate unique client ID
   */
  generateClientId() {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Start connection health monitoring
   */
  startHealthMonitoring() {
    // Ping clients every 30 seconds
    this.healthInterval = setInterval(() => {
      const now = Date.now()
      const staleClients = []

      for (const [clientId, client] of this.clients) {
        // Remove clients that haven't responded to ping in 60 seconds
        if (now - client.lastPing > 60000) {
          staleClients.push(clientId)
        } else {
          // Send ping
          if (client.ws.readyState === 1) {
            client.ws.ping()
          }
        }
      }

      // Clean up stale clients
      staleClients.forEach(clientId => {
        logger.debug('Removing stale WebSocket client', { clientId })
        this.handleDisconnection(clientId)
      })

    }, 30000) // Every 30 seconds
  }

  /**
   * Stop health monitoring
   */
  stopHealthMonitoring() {
    if (this.healthInterval) {
      clearInterval(this.healthInterval)
      this.healthInterval = null
    }
  }

  /**
   * Get WebSocket service status
   */
  getStatus() {
    return {
      connectedClients: this.clients.size,
      activeRooms: this.rooms.size,
      totalSubscriptions: Array.from(this.clients.values()).reduce((total, client) => 
        total + client.subscriptions.size, 0
      )
    }
  }

  /**
   * Shutdown WebSocket service
   */
  shutdown() {
    logger.info('Shutting down WebSocket service')

    this.stopHealthMonitoring()

    // Close all client connections
    for (const client of this.clients.values()) {
      if (client.ws.readyState === 1) {
        client.ws.close(1001, 'Server shutdown')
      }
    }

    // Close WebSocket server
    this.wss.close()

    this.clients.clear()
    this.rooms.clear()
  }
}