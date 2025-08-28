/**
 * 🧠 Browser Session Manager
 * Manages browser sessions across the application with cleanup, monitoring, and resource management
 */

import { logger } from '../middleware/errorHandler.js'
import { BrowserAutomationService } from './browserAutomationService.js'

export class BrowserSessionManager {
  constructor() {
    this.browserService = new BrowserAutomationService()
    this.sessionMetadata = new Map()
    this.cleanupInterval = null
    this.maxIdleTime = 30 * 60 * 1000 // 30 minutes
    this.sessionTimeouts = new Map()
    this.init()
  }

  async init() {
    // Start periodic cleanup
    this.startCleanupScheduler()
    
    // Setup graceful shutdown
    process.on('SIGINT', () => this.shutdown())
    process.on('SIGTERM', () => this.shutdown())
    process.on('beforeExit', () => this.shutdown())
    
    logger.info('Browser Session Manager initialized', {
      maxIdleTime: this.maxIdleTime,
      maxConcurrentBrowsers: this.browserService.maxConcurrentBrowsers
    })
  }

  /**
   * Create a new browser session for a workflow execution
   */
  async createSession(executionId, workflowId, userId, options = {}) {
    try {
      // Create browser instance
      const browser = await this.browserService.createBrowser(executionId, options)
      
      // Store session metadata
      this.sessionMetadata.set(executionId, {
        workflowId,
        userId,
        createdAt: new Date(),
        lastActivity: new Date(),
        status: 'active',
        browser: browser,
        options
      })
      
      // Set session timeout
      this.resetSessionTimeout(executionId)
      
      logger.info('Browser session created', {
        executionId,
        workflowId,
        userId,
        totalSessions: this.sessionMetadata.size
      })
      
      return {
        success: true,
        sessionId: executionId,
        browser
      }
    } catch (error) {
      logger.error('Failed to create browser session', {
        executionId,
        workflowId,
        userId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Get an existing session or create a new one
   */
  async getSession(executionId, workflowId, userId, options = {}) {
    const session = this.sessionMetadata.get(executionId)
    
    if (session && session.status === 'active') {
      // Update activity timestamp
      session.lastActivity = new Date()
      this.resetSessionTimeout(executionId)
      
      // Get browser instance
      const browser = await this.browserService.getBrowser(executionId)
      
      return {
        success: true,
        sessionId: executionId,
        browser,
        session
      }
    }
    
    // Create new session if none exists or previous was closed
    return await this.createSession(executionId, workflowId, userId, options)
  }

  /**
   * Get browser automation service instance
   */
  getBrowserService() {
    return this.browserService
  }

  /**
   * Update session activity
   */
  updateSessionActivity(executionId) {
    const session = this.sessionMetadata.get(executionId)
    if (session) {
      session.lastActivity = new Date()
      this.resetSessionTimeout(executionId)
    }
  }

  /**
   * Close a specific session
   */
  async closeSession(executionId, reason = 'manual') {
    try {
      const session = this.sessionMetadata.get(executionId)
      if (session) {
        session.status = 'closing'
        
        // Clear timeout
        const timeout = this.sessionTimeouts.get(executionId)
        if (timeout) {
          clearTimeout(timeout)
          this.sessionTimeouts.delete(executionId)
        }
        
        // Close browser
        await this.browserService.closeBrowser(executionId)
        
        // Remove metadata
        this.sessionMetadata.delete(executionId)
        
        logger.info('Browser session closed', {
          executionId,
          reason,
          duration: Date.now() - session.createdAt.getTime(),
          remainingSessions: this.sessionMetadata.size
        })
      }
    } catch (error) {
      logger.error('Failed to close browser session', {
        executionId,
        error: error.message
      })
    }
  }

  /**
   * Get session status and statistics
   */
  getSessionStatus(executionId) {
    const session = this.sessionMetadata.get(executionId)
    if (!session) {
      return { exists: false }
    }

    const browserStatus = this.browserService.getBrowserStatus(executionId)
    
    return {
      exists: true,
      status: session.status,
      workflowId: session.workflowId,
      userId: session.userId,
      createdAt: session.createdAt,
      lastActivity: session.lastActivity,
      duration: Date.now() - session.createdAt.getTime(),
      idleTime: Date.now() - session.lastActivity.getTime(),
      browser: browserStatus
    }
  }

  /**
   * Get all active sessions
   */
  getAllSessions() {
    const sessions = {}
    
    for (const [executionId, session] of this.sessionMetadata) {
      const browserStatus = this.browserService.getBrowserStatus(executionId)
      
      sessions[executionId] = {
        workflowId: session.workflowId,
        userId: session.userId,
        status: session.status,
        createdAt: session.createdAt,
        lastActivity: session.lastActivity,
        duration: Date.now() - session.createdAt.getTime(),
        idleTime: Date.now() - session.lastActivity.getTime(),
        browser: browserStatus
      }
    }
    
    return sessions
  }

  /**
   * Get session statistics
   */
  getStatistics() {
    const now = new Date()
    let activeSessions = 0
    let idleSessions = 0
    let totalMemoryUsage = 0
    let oldestSession = null
    let newestSession = null
    
    for (const [executionId, session] of this.sessionMetadata) {
      const idleTime = now - session.lastActivity
      
      if (idleTime > this.maxIdleTime) {
        idleSessions++
      } else {
        activeSessions++
      }
      
      if (!oldestSession || session.createdAt < oldestSession.createdAt) {
        oldestSession = session
      }
      
      if (!newestSession || session.createdAt > newestSession.createdAt) {
        newestSession = session
      }
    }
    
    return {
      totalSessions: this.sessionMetadata.size,
      activeSessions,
      idleSessions,
      maxConcurrentBrowsers: this.browserService.maxConcurrentBrowsers,
      oldestSessionAge: oldestSession ? now - oldestSession.createdAt : 0,
      newestSessionAge: newestSession ? now - newestSession.createdAt : 0,
      browserStats: this.browserService.getAllSessions()
    }
  }

  /**
   * Reset session timeout
   */
  resetSessionTimeout(executionId) {
    // Clear existing timeout
    const existingTimeout = this.sessionTimeouts.get(executionId)
    if (existingTimeout) {
      clearTimeout(existingTimeout)
    }
    
    // Set new timeout
    const timeout = setTimeout(() => {
      logger.info('Session idle timeout reached', { executionId })
      this.closeSession(executionId, 'idle_timeout')
    }, this.maxIdleTime)
    
    this.sessionTimeouts.set(executionId, timeout)
  }

  /**
   * Start cleanup scheduler
   */
  startCleanupScheduler() {
    // Run cleanup every 10 minutes
    this.cleanupInterval = setInterval(async () => {
      await this.performCleanup()
    }, 10 * 60 * 1000)
    
    logger.info('Browser session cleanup scheduler started')
  }

  /**
   * Perform cleanup of idle and dead sessions
   */
  async performCleanup() {
    try {
      const stats = this.getStatistics()
      logger.debug('Running browser session cleanup', stats)
      
      const now = new Date()
      const sessionsToClose = []
      
      // Find sessions to close
      for (const [executionId, session] of this.sessionMetadata) {
        const idleTime = now - session.lastActivity
        const browserStatus = this.browserService.getBrowserStatus(executionId)
        
        // Close if idle too long or browser is dead
        if (idleTime > this.maxIdleTime || !browserStatus.isOpen) {
          sessionsToClose.push({
            executionId,
            reason: idleTime > this.maxIdleTime ? 'idle_timeout' : 'browser_dead'
          })
        }
      }
      
      // Close sessions
      for (const { executionId, reason } of sessionsToClose) {
        await this.closeSession(executionId, reason)
      }
      
      // Cleanup browser service
      const browserCleanupCount = await this.browserService.cleanupIdleSessions(this.maxIdleTime)
      
      if (sessionsToClose.length > 0 || browserCleanupCount > 0) {
        logger.info('Browser session cleanup completed', {
          sessionsClosedByManager: sessionsToClose.length,
          sessionsClosedByBrowserService: browserCleanupCount,
          remainingSessions: this.sessionMetadata.size
        })
      }
      
    } catch (error) {
      logger.error('Browser session cleanup failed', { error: error.message })
    }
  }

  /**
   * Force cleanup all sessions
   */
  async cleanupAllSessions() {
    logger.info('Force cleaning up all browser sessions', {
      totalSessions: this.sessionMetadata.size
    })
    
    const closePromises = []
    for (const executionId of this.sessionMetadata.keys()) {
      closePromises.push(this.closeSession(executionId, 'force_cleanup'))
    }
    
    await Promise.allSettled(closePromises)
    
    // Clear all timeouts
    for (const timeout of this.sessionTimeouts.values()) {
      clearTimeout(timeout)
    }
    this.sessionTimeouts.clear()
    
    // Cleanup browser service
    await this.browserService.cleanup()
    
    logger.info('All browser sessions cleaned up')
  }

  /**
   * Shutdown session manager
   */
  async shutdown() {
    logger.info('Shutting down Browser Session Manager')
    
    // Stop cleanup scheduler
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    
    // Cleanup all sessions
    await this.cleanupAllSessions()
    
    logger.info('Browser Session Manager shutdown complete')
  }
}

// Create singleton instance
export const browserSessionManager = new BrowserSessionManager()