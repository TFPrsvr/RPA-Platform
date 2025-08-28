/**
 * 🧠 Browser Sessions API
 * API endpoints for managing browser automation sessions
 */

import express from 'express'
import { browserSessionManager } from '../services/browserSessionManager.js'
import { logger } from '../middleware/errorHandler.js'

const router = express.Router()

/**
 * Get all active browser sessions
 */
router.get('/', async (req, res) => {
  try {
    const sessions = browserSessionManager.getAllSessions()
    const statistics = browserSessionManager.getStatistics()
    
    res.json({
      success: true,
      data: {
        sessions,
        statistics
      }
    })
  } catch (error) {
    logger.error('Failed to get browser sessions', { error: error.message })
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * Get specific session status
 */
router.get('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params
    const session = browserSessionManager.getSessionStatus(sessionId)
    
    if (!session.exists) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      })
    }
    
    res.json({
      success: true,
      data: session
    })
  } catch (error) {
    logger.error('Failed to get session status', { 
      sessionId: req.params.sessionId,
      error: error.message 
    })
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * Close specific session
 */
router.delete('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params
    const { reason = 'manual' } = req.body
    
    // Check if session exists
    const session = browserSessionManager.getSessionStatus(sessionId)
    if (!session.exists) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      })
    }
    
    // Close session
    await browserSessionManager.closeSession(sessionId, reason)
    
    res.json({
      success: true,
      message: `Session ${sessionId} closed successfully`,
      data: {
        sessionId,
        reason
      }
    })
  } catch (error) {
    logger.error('Failed to close session', {
      sessionId: req.params.sessionId,
      error: error.message
    })
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * Take screenshot from session
 */
router.post('/:sessionId/screenshot', async (req, res) => {
  try {
    const { sessionId } = req.params
    const { pageId = 'default', options = {} } = req.body
    
    // Check if session exists
    const session = browserSessionManager.getSessionStatus(sessionId)
    if (!session.exists) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      })
    }
    
    // Take screenshot
    const browserService = browserSessionManager.getBrowserService()
    const result = await browserService.screenshot(sessionId, pageId, options)
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      })
    }
    
    res.json({
      success: true,
      message: 'Screenshot taken successfully',
      data: result
    })
  } catch (error) {
    logger.error('Failed to take screenshot', {
      sessionId: req.params.sessionId,
      error: error.message
    })
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * Execute browser action in session
 */
router.post('/:sessionId/action', async (req, res) => {
  try {
    const { sessionId } = req.params
    const { action, config = {} } = req.body
    
    // Validate action type
    const allowedActions = ['click', 'type', 'scroll', 'extract_text', 'navigate']
    if (!allowedActions.includes(action)) {
      return res.status(400).json({
        success: false,
        error: `Action '${action}' is not allowed. Allowed actions: ${allowedActions.join(', ')}`
      })
    }
    
    // Check if session exists
    const session = browserSessionManager.getSessionStatus(sessionId)
    if (!session.exists) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      })
    }
    
    const browserService = browserSessionManager.getBrowserService()
    let result
    
    // Execute action
    switch (action) {
      case 'click':
        result = await browserService.click(sessionId, config.selector, config.pageId || 'default', config.options || {})
        break
      case 'type':
        result = await browserService.type(sessionId, config.selector, config.text, config.pageId || 'default', config.options || {})
        break
      case 'scroll':
        result = await browserService.scroll(sessionId, config.direction || 'down', config.amount || 500, config.pageId || 'default')
        break
      case 'extract_text':
        result = await browserService.extractText(sessionId, config.selector, config.pageId || 'default', config.options || {})
        break
      case 'navigate':
        result = await browserService.navigate(sessionId, config.url, config.pageId || 'default', config.options || {})
        break
    }
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      })
    }
    
    res.json({
      success: true,
      message: `Action '${action}' executed successfully`,
      data: result
    })
  } catch (error) {
    logger.error('Failed to execute browser action', {
      sessionId: req.params.sessionId,
      action: req.body.action,
      error: error.message
    })
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * Get browser session statistics
 */
router.get('/stats/overview', async (req, res) => {
  try {
    const statistics = browserSessionManager.getStatistics()
    
    res.json({
      success: true,
      data: statistics
    })
  } catch (error) {
    logger.error('Failed to get session statistics', { error: error.message })
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * Force cleanup of idle sessions
 */
router.post('/cleanup', async (req, res) => {
  try {
    await browserSessionManager.performCleanup()
    const statistics = browserSessionManager.getStatistics()
    
    res.json({
      success: true,
      message: 'Session cleanup completed',
      data: {
        statistics
      }
    })
  } catch (error) {
    logger.error('Failed to cleanup sessions', { error: error.message })
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * Emergency cleanup - close all sessions
 */
router.post('/emergency-cleanup', async (req, res) => {
  try {
    const beforeStats = browserSessionManager.getStatistics()
    await browserSessionManager.cleanupAllSessions()
    const afterStats = browserSessionManager.getStatistics()
    
    res.json({
      success: true,
      message: 'Emergency cleanup completed - all sessions closed',
      data: {
        sessionsClosed: beforeStats.totalSessions,
        beforeStats,
        afterStats
      }
    })
  } catch (error) {
    logger.error('Failed to perform emergency cleanup', { error: error.message })
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

export default router