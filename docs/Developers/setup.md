# ⚡ Developer Setup

## 🛠️ Prerequisites
- Node.js (v18+)
- npm
- Git

## 🔧 Installation
```bash
git clone [repository-url]
cd RPA-Platform
npm install
```

## 🌍 Environment Configuration
Copy `.env.example` to `.env` and configure:
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `NODE_ENV=development`

## 🚀 Running the Application
```bash
npm run dev        # Start frontend (Vite) + backend (Express) + WebSocket server
npm run build      # Build for production
npm start          # Run production server
npm run preview    # Preview built application
```

## 🧪 Testing
```bash
npm test                 # Run frontend tests
npm run test:integration # Backend integration tests
npm run test:webhooks    # Webhook tests
npm run test:ui         # Visual test runner
```

## 📁 Project Structure
```
RPA-Platform/
├── src/             # React frontend
├── server/          # Express backend
│   ├── services/    # Core services
│   ├── routes/      # API endpoints
│   ├── middleware/  # Express middleware
│   └── tests/       # Backend tests
├── docs/            # Documentation
└── package.json     # Single package config
```