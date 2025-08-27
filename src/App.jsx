import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { SignedIn, SignedOut, useUser, useOrganization } from '@clerk/clerk-react'
import Navbar from './components/Navbar/Navbar'
import Dashboard from './pages/Dashboard/Dashboard'
import WorkflowBuilder from './pages/WorkflowBuilder/WorkflowBuilder'
import Landing from './pages/Landing/Landing'
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary'
import { AIWorkflowGenerator } from './components/AIWorkflowGenerator/AIWorkflowGenerator'
import { Toaster } from '@/components/ui/sonner'
import useAppStore, { useBrandingConfig } from './store/useAppStore'
import { profileService } from './lib/supabase'
import './App.css'

function AuthenticatedApp() {
  const { user } = useUser()
  const { organization } = useOrganization()
  const brandingConfig = useBrandingConfig()
  const setBrandingConfig = useAppStore((state) => state.setBrandingConfig)
  const setUser = useAppStore((state) => state.setUser)

  useEffect(() => {
    if (user) {
      setUser(user)
      profileService.getProfile(user.id)
        .then(profile => {
          if (profile?.branding_config) {
            setBrandingConfig(profile.branding_config)
          }
        })
        .catch(error => {
          console.log('Profile not found, continuing without profile data')
          // For now, just continue without creating profile
          // This avoids the 400 error since we don't have webhooks set up
        })
    }
  }, [user, setUser, setBrandingConfig])

  return (
    <div 
      className="app"
      style={{
        '--primary-color': brandingConfig.primaryColor,
        '--secondary-color': brandingConfig.secondaryColor
      }}
    >
      <Navbar brandingConfig={brandingConfig} />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard brandingConfig={brandingConfig} />} />
          <Route path="/builder" element={<WorkflowBuilder brandingConfig={brandingConfig} />} />
          <Route path="/builder/:id" element={<WorkflowBuilder brandingConfig={brandingConfig} />} />
          <Route path="/ai-generator" element={<AIWorkflowGenerator />} />
        </Routes>
      </main>
    </div>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <DndProvider backend={HTML5Backend}>
        <Router>
          <SignedIn>
            <AuthenticatedApp />
          </SignedIn>
          <SignedOut>
            <Landing />
          </SignedOut>
          <Toaster />
        </Router>
      </DndProvider>
    </ErrorBoundary>
  )
}

export default App