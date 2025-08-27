# 🤖 RPA Platform

A modern, full-stack **Robotic Process Automation** platform built with React and Node.js. Create, manage, and execute automation workflows with a visual drag-and-drop interface.

## 🏗️ Project Structure

Standard full-stack application structure:

```
RPA-Platform/
├── src/             # React frontend source code
├── server/          # Express backend services
├── docs/            # Documentation
├── dist/            # Built frontend (production)
├── package.json     # Single package configuration
└── README.md        # This file
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm

### Installation & Development

```bash
# Install dependencies
npm install

# Start both frontend and backend in development mode
npm run dev

# Frontend: http://localhost:5173
# Backend API: http://localhost:3000
```

### Production Build & Deploy

```bash
# Build frontend for production
npm run build

# Start production server (serves frontend + API)
npm start
```

## 📦 Package Scripts

- `npm run dev` - Start both frontend (Vite) and backend (Express + WebSocket)
- `npm run build` - Build frontend for production
- `npm start` - Run production server
- `npm run preview` - Preview built frontend
- `npm run lint` - Run ESLint
- `npm test` - Run frontend tests
- `npm run test:integration` - Run backend integration tests
- `npm run test:webhooks` - Run webhook tests

## 🎯 Features

### ✅ Implemented
- **Visual Workflow Builder** - Drag & drop interface
- **13+ Node Types** - Actions, logic, data, and control nodes
- **Visual Connections** - Port-based node linking system
- **Execution Engine** - Complete workflow executor
- **Templates** - 4 ready-to-use workflow templates
- **Authentication** - Clerk integration
- **Database** - Supabase integration

### 🚧 In Development
- Real browser automation
- Organization-based workflows
- Advanced scheduling
- Workflow sharing & collaboration

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI framework
- **Vite** - Build tool & dev server
- **TailwindCSS** - Styling
- **React DnD** - Drag and drop
- **Zustand** - State management
- **Clerk** - Authentication
- **Vitest** - Testing

### Backend
- **Node.js** - Runtime
- **Express** - Web framework
- **Supabase** - Database & auth
- **WebSocket** - Real-time communication
- **Svix** - Webhook handling

### Architecture
- **Full-stack single deployment** - Frontend served by backend
- **Modern ES modules** - JavaScript with ESM
- **Real-time features** - WebSocket integration
- **Comprehensive services** - Workflow engine, scheduler, analytics

## 📁 Directory Details

### `/src` - Frontend Application
React application with visual workflow builder, dashboard, and user interface.

### `/server` - Backend Services
Express API endpoints, workflow engine, scheduler, WebSocket services, and database integration.

### `/docs` - Documentation
Organized documentation for developers, business users, configurations, and integrations.

## 🔧 Development

### Environment Setup
1. Copy `.env.example` to `.env`
2. Configure your Supabase URL and service key
3. Run `npm install`
4. Start development with `npm run dev`

### Code Style
- ESLint configuration
- Consistent naming conventions
- Professional file organization
- JavaScript + JSX (no TypeScript)

## 🚀 Deployment

### Single Deployment
Deploy as one application to:
- Railway, Heroku, AWS ECS, Google Cloud Run
- Backend serves both API and built frontend

### Environment Variables
Set these in production:
- `VITE_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NODE_ENV=production`

## 📚 Documentation

See `/docs` directory for:
- **Developers** - Technical setup and API docs
- **Business Users** - User guides  
- **Configs** - Database and environment setup
- **Integrations** - Third-party service setup

---

**Built with ❤️ for automation enthusiasts**