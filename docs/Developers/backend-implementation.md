# 🏗️ Backend Implementation Guide

## Overview

The RPA Platform backend consists of two main server applications:
- **API Server** (`server/index.js`) - RESTful API endpoints on port 3000
- **Webhook Server** (`server/webhook-server.js`) - Clerk webhook handlers on port 3001

## Architecture

### 🗄️ Database Schema

Our Supabase PostgreSQL database includes the following tables:

#### Core Tables
- **`profiles`** - User profile information synced from Clerk
- **`organizations`** - Multi-tenant organization data  
- **`organization_memberships`** - User-organization relationships with roles
- **`workflows`** - RPA workflow definitions and metadata
- **`workflow_executions`** - Execution history and results

#### Security Features
- Row Level Security (RLS) policies on all tables
- Multi-tenant data isolation by organization
- Role-based access control (admin, member, viewer)

### 🔐 Authentication & Authorization

#### Multi-Tenant Access Control
```javascript
// Authentication middleware validates user existence
import { authenticateUser } from '../middleware/auth.js'

// Organization role validation
import { requireOrganizationRole } from '../middleware/auth.js'

// Resource access validation
import { validateResourceAccess } from '../middleware/auth.js'
```

#### Request Headers
- `x-user-id`: Clerk user ID (required)
- `x-organization-id`: Organization context (optional)

#### Role Hierarchy
1. **Admin** - Full organization management
2. **Member** - Create/manage own workflows 
3. **Viewer** - Read-only access

### 🚀 API Endpoints

#### Workflow Management
```http
GET    /api/workflows                 # List user's workflows
POST   /api/workflows                 # Create new workflow  
GET    /api/workflows/:id             # Get workflow details
PUT    /api/workflows/:id             # Update workflow
DELETE /api/workflows/:id             # Delete workflow
POST   /api/workflows/:id/duplicate   # Duplicate workflow
POST   /api/workflows/:id/execute     # Execute workflow
GET    /api/workflows/:id/executions  # Get execution history
```

#### Organization Management  
```http
GET    /api/organizations             # List user's organizations
POST   /api/organizations             # Create organization
GET    /api/organizations/:id         # Get organization details
PUT    /api/organizations/:id         # Update organization (admin)
POST   /api/organizations/:id/members # Add member (admin)
PUT    /api/organizations/:id/members/:userId # Update member role (admin)  
DELETE /api/organizations/:id/members/:userId # Remove member (admin/self)
```

### 🪝 Webhook Integration

#### Clerk Events Handled
- `user.created` - Create profile record
- `user.updated` - Update profile information
- `user.deleted` - Anonymize profile data
- `organization.created` - Create organization record
- `organization.updated` - Update organization information
- `organization.deleted` - Delete organization
- `organizationMembership.created` - Add membership record
- `organizationMembership.updated` - Update member role
- `organizationMembership.deleted` - Remove membership

#### Security
- Svix signature verification for all webhooks
- Environment variable validation
- Request logging and error handling

## 🧪 Testing

### Integration Tests
```bash
# Test database connectivity and operations
npm run test

# Test webhook endpoints and signature verification  
npm run test:webhooks
```

### Test Coverage
- Database connection and table access
- Row Level Security policy validation
- CRUD operations for workflows and organizations
- Webhook signature verification
- Error handling and edge cases

## 🛡️ Security Features

### Data Protection
- **Encryption at Rest** - Supabase handles database encryption
- **Secure Headers** - Helmet.js security middleware
- **CORS Configuration** - Restricted origins and methods
- **Input Validation** - Request payload validation
- **SQL Injection Prevention** - Parameterized queries via Supabase client

### Access Control
```javascript
// Example: Workflow access validation
const workflow = await supabase
  .from('workflows')
  .select('*')
  .eq('id', workflowId)
  .or(`user_id.eq.${userId},organization_id.in.(${userOrgs.join(',')})`)
```

### Error Handling
- Centralized error logging with structured data
- Error classification and appropriate HTTP status codes
- Development vs production error response levels
- Request ID tracking for debugging

## 📊 Monitoring & Logging

### Logger Features
- Colored console output by log level
- File logging in production environments
- Request/response logging with timing
- Error tracking with stack traces
- Health check endpoints

### Log Levels
- **ERROR** - Application errors and failures
- **WARN** - Warning conditions and deprecated usage
- **INFO** - General application information
- **DEBUG** - Detailed debugging information (development only)

## 🔧 Environment Configuration

### Required Variables
```bash
# Server Configuration
PORT=3000
WEBHOOK_PORT=3001  
NODE_ENV=development

# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Clerk  
CLERK_WEBHOOK_SECRET=whsec_...

# Security
CLIENT_URL=http://localhost:5173
```

### Validation
- Automatic environment validation on startup
- Type checking for URLs, numbers, booleans
- Custom validation functions for API keys
- Clear error messages for missing variables

## 📈 Performance Optimizations

### Database Optimizations
- Indexed columns for common queries
- Efficient pagination with range queries
- Connection pooling via Supabase
- Query optimization with select projections

### Caching Strategy
- Supabase client connection reuse
- Request-level organization membership caching
- Static asset serving with appropriate cache headers

### Rate Limiting
- Express rate limiting middleware (configurable)
- Webhook endpoint protection
- Per-user request limits

## 🚦 Development Workflow

### Local Development
```bash
# Start both API and webhook servers
npm run dev

# Start servers individually  
npm run server:dev        # API server only
npm run server:webhook    # Webhook server only
```

### Production Deployment
```bash
# Build client application
npm run build

# Start production servers
npm run start             # API server
npm run server:webhook    # Webhook server (separate process)
```

### Code Quality
- ESLint configuration with modern JavaScript rules
- Import/export validation
- Consistent error handling patterns
- TypeScript-ready architecture

## 🔄 Data Flow

### User Registration Flow
1. User signs up via Clerk in frontend
2. Clerk sends `user.created` webhook to backend
3. Backend creates profile record in Supabase
4. User can now access API with `x-user-id` header

### Workflow Execution Flow
1. User creates workflow via frontend
2. Frontend calls `POST /api/workflows`
3. Backend validates and stores workflow
4. User triggers execution via `POST /api/workflows/:id/execute`
5. Backend creates execution record (future: triggers actual automation)

### Organization Management Flow
1. Admin creates organization via Clerk or API
2. Webhook/API creates organization record
3. Admin invites users via `POST /api/organizations/:id/members`
4. Users can access organization workflows based on role

## 📚 Next Steps

### Phase 3: Advanced Features
- Real workflow execution engine
- Scheduled workflow runs
- Workflow templates and marketplace
- Advanced monitoring and analytics
- WebSocket real-time updates

### Infrastructure Improvements  
- Docker containerization
- Kubernetes deployment configs
- CI/CD pipeline setup
- Automated testing in staging
- Performance monitoring setup

### Security Enhancements
- JWT token validation instead of header-based auth
- API rate limiting per user/organization
- Audit logging for sensitive operations
- Data retention and backup policies