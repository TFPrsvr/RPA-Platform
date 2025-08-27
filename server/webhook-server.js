import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import { Webhook } from 'svix'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

// Validate environment variables
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
const port = process.env.PORT || process.env.WEBHOOK_PORT || 3001

// Initialize Supabase with service role key for admin operations
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

// Middleware
app.use(helmet({
  contentSecurityPolicy: false // Allow for webhook endpoints
}))

// Logging
const logFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev'
app.use(morgan(logFormat))

// CORS configuration
const corsOptions = {
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'svix-id', 'svix-signature', 'svix-timestamp']
}
app.use(cors(corsOptions))

// Request logging middleware
if (process.env.NODE_ENV !== 'test') {
  app.use(requestLogger)
}

// Raw body parser for webhook signature verification
app.use('/api/webhooks/clerk', express.raw({ type: 'application/json' }))
app.use(express.json())

// Import routes
import { initializeRoutes as initializeWorkflowRoutes } from './routes/workflows.js'
import { initializeRoutes as initializeOrganizationRoutes } from './routes/organizations.js'

// Import middleware
import { 
  logger, 
  requestLogger, 
  globalErrorHandler, 
  notFoundHandler,
  createHealthCheck 
} from './middleware/errorHandler.js'

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  })
})

// API Routes
app.use('/api/workflows', initializeWorkflowRoutes(supabase))
app.use('/api/organizations', initializeOrganizationRoutes(supabase))

// Webhook signature verification
const verifyWebhook = (req, res, next) => {
  try {
    const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET
    if (!WEBHOOK_SECRET) {
      console.error('CLERK_WEBHOOK_SECRET not set')
      return res.status(500).json({ error: 'Webhook secret not configured' })
    }

    const svix_id = req.headers['svix-id']
    const svix_timestamp = req.headers['svix-timestamp']
    const svix_signature = req.headers['svix-signature']

    if (!svix_id || !svix_timestamp || !svix_signature) {
      return res.status(400).json({ error: 'Missing svix headers' })
    }

    const wh = new Webhook(WEBHOOK_SECRET)
    const payload = wh.verify(req.body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature
    })

    req.webhookPayload = payload
    next()
  } catch (error) {
    console.error('Webhook verification failed:', error.message)
    return res.status(400).json({ error: 'Webhook verification failed' })
  }
}

// User webhook handlers
const handleUserCreated = async (data) => {
  console.log('Processing user.created:', data.id)
  
  const { error } = await supabase
    .from('profiles')
    .insert({
      id: data.id,
      clerk_user_id: data.id,
      email: data.email_addresses?.[0]?.email_address,
      branding_config: {
        primaryColor: '#007bff',
        secondaryColor: '#6c757d',
        companyName: 'AutoFlow RPA'
      }
    })

  if (error) {
    console.error('Error creating profile:', error)
    throw error
  }
  
  console.log('Profile created successfully for user:', data.id)
}

const handleUserUpdated = async (data) => {
  console.log('Processing user.updated:', data.id)
  
  const { error } = await supabase
    .from('profiles')
    .update({
      email: data.email_addresses?.[0]?.email_address,
    })
    .eq('clerk_user_id', data.id)

  if (error) {
    console.error('Error updating profile:', error)
    throw error
  }
  
  console.log('Profile updated successfully for user:', data.id)
}

const handleUserDeleted = async (data) => {
  console.log('Processing user.deleted:', data.id)
  
  // Note: Due to foreign key constraints, we might want to anonymize instead of delete
  const { error } = await supabase
    .from('profiles')
    .update({
      email: null,
      clerk_user_id: null
    })
    .eq('clerk_user_id', data.id)

  if (error) {
    console.error('Error anonymizing profile:', error)
    throw error
  }
  
  console.log('Profile anonymized successfully for user:', data.id)
}

// Organization webhook handlers
const handleOrganizationCreated = async (data) => {
  console.log('Processing organization.created:', data.id)
  
  const { error } = await supabase
    .from('organizations')
    .insert({
      clerk_org_id: data.id,
      name: data.name,
      slug: data.slug,
      branding_config: {}
    })

  if (error) {
    console.error('Error creating organization:', error)
    throw error
  }
  
  console.log('Organization created successfully:', data.id)
}

const handleOrganizationUpdated = async (data) => {
  console.log('Processing organization.updated:', data.id)
  
  const { error } = await supabase
    .from('organizations')
    .update({
      name: data.name,
      slug: data.slug
    })
    .eq('clerk_org_id', data.id)

  if (error) {
    console.error('Error updating organization:', error)
    throw error
  }
  
  console.log('Organization updated successfully:', data.id)
}

const handleOrganizationDeleted = async (data) => {
  console.log('Processing organization.deleted:', data.id)
  
  const { error } = await supabase
    .from('organizations')
    .delete()
    .eq('clerk_org_id', data.id)

  if (error) {
    console.error('Error deleting organization:', error)
    throw error
  }
  
  console.log('Organization deleted successfully:', data.id)
}

// Organization membership webhook handlers
const handleOrganizationMembershipCreated = async (data) => {
  console.log('Processing organizationMembership.created:', data.id)
  
  // Get organization and user IDs from Supabase
  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('clerk_org_id', data.organization.id)
    .single()

  if (!org) {
    console.error('Organization not found for membership:', data.organization.id)
    return
  }

  const { error } = await supabase
    .from('organization_memberships')
    .insert({
      organization_id: org.id,
      user_id: data.public_user_data.user_id,
      role: data.role
    })

  if (error) {
    console.error('Error creating organization membership:', error)
    throw error
  }
  
  console.log('Organization membership created successfully:', data.id)
}

const handleOrganizationMembershipUpdated = async (data) => {
  console.log('Processing organizationMembership.updated:', data.id)
  
  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('clerk_org_id', data.organization.id)
    .single()

  if (!org) {
    console.error('Organization not found for membership update:', data.organization.id)
    return
  }

  const { error } = await supabase
    .from('organization_memberships')
    .update({
      role: data.role
    })
    .eq('organization_id', org.id)
    .eq('user_id', data.public_user_data.user_id)

  if (error) {
    console.error('Error updating organization membership:', error)
    throw error
  }
  
  console.log('Organization membership updated successfully:', data.id)
}

const handleOrganizationMembershipDeleted = async (data) => {
  console.log('Processing organizationMembership.deleted:', data.id)
  
  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('clerk_org_id', data.organization.id)
    .single()

  if (!org) {
    console.error('Organization not found for membership deletion:', data.organization.id)
    return
  }

  const { error } = await supabase
    .from('organization_memberships')
    .delete()
    .eq('organization_id', org.id)
    .eq('user_id', data.public_user_data.user_id)

  if (error) {
    console.error('Error deleting organization membership:', error)
    throw error
  }
  
  console.log('Organization membership deleted successfully:', data.id)
}

// Main webhook endpoint
app.post('/api/webhooks/clerk', verifyWebhook, async (req, res) => {
  const { type, data } = req.webhookPayload

  try {
    switch (type) {
      // User events
      case 'user.created':
        await handleUserCreated(data)
        break
      case 'user.updated':
        await handleUserUpdated(data)
        break
      case 'user.deleted':
        await handleUserDeleted(data)
        break

      // Organization events
      case 'organization.created':
        await handleOrganizationCreated(data)
        break
      case 'organization.updated':
        await handleOrganizationUpdated(data)
        break
      case 'organization.deleted':
        await handleOrganizationDeleted(data)
        break

      // Organization membership events
      case 'organizationMembership.created':
        await handleOrganizationMembershipCreated(data)
        break
      case 'organizationMembership.updated':
        await handleOrganizationMembershipUpdated(data)
        break
      case 'organizationMembership.deleted':
        await handleOrganizationMembershipDeleted(data)
        break

      default:
        console.log('Unhandled webhook type:', type)
    }

    res.status(200).json({ received: true, type })
  } catch (error) {
    console.error('Webhook processing error:', error)
    res.status(500).json({ error: 'Webhook processing failed' })
  }
})

// Error handling middleware (must be last)
app.use(notFoundHandler)
app.use(globalErrorHandler)

// Start server
app.listen(port, () => {
  console.log(`🚀 Webhook server running on port ${port}`)
  console.log(`📡 Webhook endpoint: http://localhost:${port}/api/webhooks/clerk`)
  console.log(`💓 Health check: http://localhost:${port}/health`)
})

export default app