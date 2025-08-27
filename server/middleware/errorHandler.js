/**
 * 🚨 Error Handling Middleware
 * Centralized error handling and logging
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../logs')
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true })
}

/**
 * Logger utility
 */
export class Logger {
  constructor() {
    this.logFile = path.join(logsDir, `app-${new Date().toISOString().split('T')[0]}.log`)
  }

  log(level, message, meta = {}) {
    const timestamp = new Date().toISOString()
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      ...meta
    }

    // Console output with colors
    const colors = {
      ERROR: '\x1b[31m',   // Red
      WARN: '\x1b[33m',    // Yellow
      INFO: '\x1b[36m',    // Cyan
      DEBUG: '\x1b[35m',   // Magenta
      RESET: '\x1b[0m'     // Reset
    }

    const color = colors[level.toUpperCase()] || colors.INFO
    console.log(`${color}[${timestamp}] ${level.toUpperCase()}: ${message}${colors.RESET}`)
    
    if (meta && Object.keys(meta).length > 0) {
      console.log(`${color}${JSON.stringify(meta, null, 2)}${colors.RESET}`)
    }

    // File output (only in production or when LOG_TO_FILE is set)
    if (process.env.NODE_ENV === 'production' || process.env.LOG_TO_FILE === 'true') {
      try {
        fs.appendFileSync(this.logFile, JSON.stringify(logEntry) + '\n')
      } catch (error) {
        console.error('Failed to write to log file:', error.message)
      }
    }
  }

  error(message, meta = {}) {
    this.log('error', message, meta)
  }

  warn(message, meta = {}) {
    this.log('warn', message, meta)
  }

  info(message, meta = {}) {
    this.log('info', message, meta)
  }

  debug(message, meta = {}) {
    if (process.env.NODE_ENV === 'development' || process.env.LOG_LEVEL === 'debug') {
      this.log('debug', message, meta)
    }
  }
}

export const logger = new Logger()

/**
 * Request logging middleware
 */
export function requestLogger(req, res, next) {
  const start = Date.now()
  
  // Log request
  logger.info('Request started', {
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId: req.headers['x-user-id'] || 'anonymous'
  })

  // Override res.end to log response
  const originalEnd = res.end
  res.end = function(...args) {
    const duration = Date.now() - start
    
    logger.info('Request completed', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: req.headers['x-user-id'] || 'anonymous'
    })
    
    originalEnd.apply(res, args)
  }

  next()
}

/**
 * Error classification
 */
export function classifyError(error) {
  // Supabase/PostgreSQL errors
  if (error.code) {
    switch (error.code) {
      case 'PGRST301':
        return { type: 'NOT_FOUND', statusCode: 404, message: 'Resource not found' }
      case 'PGRST116':
        return { type: 'FORBIDDEN', statusCode: 403, message: 'Access denied' }
      case 'PGRST204':
        return { type: 'BAD_REQUEST', statusCode: 400, message: 'Invalid request data' }
      case '23505':
        return { type: 'CONFLICT', statusCode: 409, message: 'Resource already exists' }
      case '23503':
        return { type: 'BAD_REQUEST', statusCode: 400, message: 'Referenced resource does not exist' }
      default:
        return { type: 'DATABASE_ERROR', statusCode: 500, message: 'Database operation failed' }
    }
  }

  // Validation errors
  if (error.name === 'ValidationError') {
    return { type: 'VALIDATION_ERROR', statusCode: 400, message: error.message }
  }

  // Authentication errors
  if (error.name === 'UnauthorizedError' || error.name === 'AuthenticationError') {
    return { type: 'UNAUTHORIZED', statusCode: 401, message: 'Authentication required' }
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    return { type: 'UNAUTHORIZED', statusCode: 401, message: 'Invalid token' }
  }

  if (error.name === 'TokenExpiredError') {
    return { type: 'UNAUTHORIZED', statusCode: 401, message: 'Token expired' }
  }

  // Rate limiting
  if (error.name === 'RateLimitError') {
    return { type: 'RATE_LIMIT', statusCode: 429, message: 'Too many requests' }
  }

  // Default to internal server error
  return { type: 'INTERNAL_ERROR', statusCode: 500, message: 'Internal server error' }
}

/**
 * Global error handler middleware
 * Should be the last middleware added to the app
 */
export function globalErrorHandler(error, req, res, next) {
  const { type, statusCode, message } = classifyError(error)
  
  // Log error details
  logger.error('Request failed', {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: error.code
    },
    request: {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.body,
      params: req.params,
      query: req.query
    },
    classification: {
      type,
      statusCode,
      message
    }
  })

  // Don't leak error details in production
  const errorResponse = {
    error: message,
    type,
    timestamp: new Date().toISOString(),
    requestId: req.id || 'unknown'
  }

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.details = error.message
    errorResponse.stack = error.stack
  }

  res.status(statusCode).json(errorResponse)
}

/**
 * 404 handler for unmatched routes
 */
export function notFoundHandler(req, res) {
  logger.warn('Route not found', {
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  })

  res.status(404).json({
    error: 'Route not found',
    type: 'NOT_FOUND',
    message: `${req.method} ${req.url} does not exist`,
    timestamp: new Date().toISOString()
  })
}

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

/**
 * Health check helper
 */
export function createHealthCheck(services = {}) {
  return async (req, res) => {
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      services: {}
    }

    // Check service health
    for (const [name, checkFn] of Object.entries(services)) {
      try {
        const isHealthy = await checkFn()
        health.services[name] = isHealthy ? 'healthy' : 'unhealthy'
      } catch (error) {
        health.services[name] = 'error'
        logger.error(`Health check failed for ${name}`, { error: error.message })
      }
    }

    // Determine overall status
    const serviceStatuses = Object.values(health.services)
    if (serviceStatuses.includes('error') || serviceStatuses.includes('unhealthy')) {
      health.status = 'degraded'
      res.status(503)
    }

    res.json(health)
  }
}