import { useState, useEffect, useCallback, useMemo, memo } from 'react'
import { Link } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import PropTypes from 'prop-types'
import { workflowService } from '../../lib/supabase'
import LoadingSpinner from '../../components/LoadingSpinner/LoadingSpinner'
import ErrorBoundary from '../../components/ErrorBoundary/ErrorBoundary'
import { Button, Card, CardHeader, CardTitle, CardContent } from '@/components/ui'
import { ERROR_MESSAGES } from '../../constants/apiEndpoints'
import { toast } from 'sonner'
import './Dashboard.css'

const Dashboard = ({ brandingConfig }) => {
  const { user } = useUser()
  const [workflows, setWorkflows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [stats, setStats] = useState({
    totalWorkflows: 0,
    activeWorkflows: 0,
    successfulRuns: 0,
    failedRuns: 0
  })

  const loadWorkflows = useCallback(async () => {
    if (!user?.id) {
      setError('User not authenticated')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const data = await workflowService.getWorkflows(user.id)
      
      if (!Array.isArray(data)) {
        throw new Error('Invalid data format received')
      }
      
      setWorkflows(data)
      
      setStats({
        totalWorkflows: data.length,
        activeWorkflows: data.filter(w => w.status === 'active').length,
        successfulRuns: data.reduce((acc, w) => acc + (w.successful_runs || 0), 0),
        failedRuns: data.reduce((acc, w) => acc + (w.failed_runs || 0), 0)
      })
    } catch (err) {
      console.error('Error loading workflows:', err)
      
      if (err.message?.includes('network') || err.message?.includes('fetch')) {
        setError(ERROR_MESSAGES.NETWORK_ERROR)
        toast.error(ERROR_MESSAGES.NETWORK_ERROR)
      } else if (err.message?.includes('unauthorized')) {
        setError(ERROR_MESSAGES.UNAUTHORIZED)
        toast.error(ERROR_MESSAGES.UNAUTHORIZED)
      } else {
        setError(ERROR_MESSAGES.SERVER_ERROR)
        toast.error(ERROR_MESSAGES.SERVER_ERROR)
      }
      
      setWorkflows([])
      setStats({ totalWorkflows: 0, activeWorkflows: 0, successfulRuns: 0, failedRuns: 0 })
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    if (user) {
      loadWorkflows()
    }
  }, [user, loadWorkflows])

  const recentWorkflows = useMemo(() => workflows.slice(0, 6), [workflows])

  const hasWorkflows = useMemo(() => workflows.length > 0, [workflows.length])


  if (loading) {
    return (
      <div className="dashboard page-container">
        <LoadingSpinner message="Loading your workflows..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="dashboard page-container">
        <Card className="p-8 text-center">
          <CardContent className="space-y-4">
            <div className="text-6xl text-red-500">⚠️</div>
            <h2 className="text-xl font-semibold text-gray-900">Unable to Load Dashboard</h2>
            <p className="text-gray-600">{error}</p>
            <Button 
              onClick={loadWorkflows}
              variant="outline"
              aria-label="Retry loading workflows"
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <div className="dashboard page-container">
        <div className="dashboard-header flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <div className="flex gap-3">
            <Button asChild variant="outline">
              <Link to="/ai-generator">
                🤖 AI Generator
              </Link>
            </Button>
            <Button asChild>
              <Link to="/builder">
                Create New Workflow
              </Link>
            </Button>
          </div>
        </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Workflows</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{stats.totalWorkflows}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Active Workflows</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{stats.activeWorkflows}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Successful Runs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{stats.successfulRuns}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Failed Runs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{stats.failedRuns}</div>
          </CardContent>
        </Card>
      </div>

      <div className="workflows-section">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Recent Workflows</h2>
        {!hasWorkflows ? (
          <Card className="p-8 text-center">
            <CardContent className="space-y-4">
              <div className="text-6xl">🤖</div>
              <h3 className="text-xl font-semibold text-gray-900">No workflows created yet</h3>
              <p className="text-gray-600">Get started by creating your first automation workflow</p>
              <div className="flex gap-3 justify-center">
                <Button asChild variant="outline">
                  <Link to="/ai-generator">
                    🤖 Use AI Generator
                  </Link>
                </Button>
                <Button asChild>
                  <Link to="/builder">
                    Manual Builder
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentWorkflows.map((workflow) => (
              <Card key={workflow.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg">{workflow.name}</CardTitle>
                  <p className="text-sm text-gray-600">{workflow.description || 'No description'}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      workflow.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : workflow.status === 'inactive'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {workflow.status || 'draft'}
                    </span>
                    <span className="text-sm text-gray-500">
                      Last run: {workflow.last_run || 'Never'}
                    </span>
                  </div>
                  <Button asChild className="w-full">
                    <Link to={`/builder/${workflow.id}`}>
                      Edit Workflow
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        </div>
      </div>
    </ErrorBoundary>
  )
}

Dashboard.propTypes = {
  brandingConfig: PropTypes.shape({
    primaryColor: PropTypes.string,
    secondaryColor: PropTypes.string,
    companyName: PropTypes.string,
    logo: PropTypes.string,
  }).isRequired,
}

export default memo(Dashboard)