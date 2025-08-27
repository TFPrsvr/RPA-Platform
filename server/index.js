/**
 * 🚀 Main API Server
 * RESTful API server for RPA Platform
 */

import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import path from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()

const requiredEnvVars = ['VITE_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName])

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:')
  missingEnvVars.forEach(varName => {
    console.error(`   - ${varName}`)
  })
  console.error('\n📝 Please check your .env file and server/.env.example')
  process.exit(1)
}

const app = express()
const port = process.env.PORT || process.env.API_PORT || 3000

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false
}))

// Logging
const logFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev'
app.use(morgan(logFormat))

// CORS configuration
const corsOptions = {
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id']
}
app.use(cors(corsOptions))

// Body parsing
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Import middleware
import { 
  requestLogger, 
  globalErrorHandler, 
  notFoundHandler
} from './middleware/errorHandler.js'

// Request logging middleware
if (process.env.NODE_ENV !== 'test') {
  app.use(requestLogger)
}

// Import services
import { WorkflowEngine } from './services/workflowEngine.js'
import { WorkflowScheduler } from './services/workflowScheduler.js'
import { WebSocketService } from './services/websocketService.js'

// Import routes
import { initializeRoutes as initializeWorkflowRoutes } from './routes/workflows.js'
import { initializeRoutes as initializeOrganizationRoutes } from './routes/organizations.js'

// Initialize services
const workflowEngine = new WorkflowEngine(supabase)
const workflowScheduler = new WorkflowScheduler(supabase, workflowEngine)

// Start scheduler
workflowScheduler.start()

// Health check endpoint
app.get('/health', (req, res) => {
  const engineStatus = workflowEngine.getQueueStatus()
  const schedulerStatus = workflowScheduler.getStatus()
  const websocketStatus = app.websocketService?.getStatus() || { connectedClients: 0, activeRooms: 0 }
  
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    services: {
      workflowEngine: {
        activeExecutions: engineStatus.activeExecutions,
        queuedExecutions: engineStatus.queuedExecutions,
        maxConcurrent: engineStatus.maxConcurrent
      },
      scheduler: {
        isRunning: schedulerStatus.isRunning,
        scheduledJobs: schedulerStatus.scheduledJobsCount
      },
      websocket: {
        connectedClients: websocketStatus.connectedClients,
        activeRooms: websocketStatus.activeRooms,
        totalSubscriptions: websocketStatus.totalSubscriptions
      }
    }
  })
})

// API Routes
app.use('/api/workflows', initializeWorkflowRoutes(supabase, workflowEngine, workflowScheduler))
app.use('/api/organizations', initializeOrganizationRoutes(supabase))

// Serve static files from the dist directory in production
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../dist')
  app.use(express.static(distPath))
  
  // Handle client-side routing - serve index.html for all non-API routes
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api/')) {
      res.sendFile(path.join(distPath, 'index.html'))
    } else {
      res.status(404).json({ error: 'API endpoint not found' })
    }
  })
}

// Error handling middleware (must be last)
app.use(notFoundHandler)
app.use(globalErrorHandler)

// Start server
const server = app.listen(port, () => {
  // Initialize WebSocket service after server starts
  const websocketService = new WebSocketService(server, workflowEngine, workflowScheduler)
  websocketService.startHealthMonitoring()
  
  // Store reference for shutdown
  app.websocketService = websocketService
  
  console.log(`🚀 API server running on port ${port}`)
  console.log(`📋 API endpoints: http://localhost:${port}/api`)
  console.log(`🔌 WebSocket endpoint: ws://localhost:${port}/ws`)
  console.log(`💓 Health check: http://localhost:${port}/health`)
  console.log(`⚙️ Workflow engine: ${workflowEngine.maxConcurrentExecutions} max concurrent executions`)
  console.log(`📅 Scheduler: ${workflowScheduler.getStatus().isRunning ? 'Running' : 'Stopped'}`)
})

// Graceful shutdown
process.on('SIGTERM', gracefulShutdown)
process.on('SIGINT', gracefulShutdown)

async function gracefulShutdown(signal) {
  console.log(`\n🛑 Received ${signal}, starting graceful shutdown...`)
  
  // Stop accepting new connections
  server.close(() => {
    console.log('✅ HTTP server closed')
  })
  
  // Shutdown services
  try {
    // Shutdown WebSocket service
    if (app.websocketService) {
      app.websocketService.shutdown()
      console.log('✅ WebSocket service stopped')
    }
    
    await workflowScheduler.stop()
    console.log('✅ Workflow scheduler stopped')
    
    await workflowEngine.shutdown()
    console.log('✅ Workflow engine shutdown complete')
    
    console.log('✅ Graceful shutdown complete')
    process.exit(0)
  } catch (error) {
    console.error('❌ Error during shutdown:', error)
    process.exit(1)
  }
}

export default app