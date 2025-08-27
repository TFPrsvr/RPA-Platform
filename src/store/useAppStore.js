import { create } from 'zustand'
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware'

const useAppStore = create(
  devtools(
    persist(
      subscribeWithSelector((set, get) => ({
        // User state
        user: null,
        setUser: (user) => set({ user }, false, 'setUser'),
        clearUser: () => set({ user: null }, false, 'clearUser'),

        // Branding configuration
        brandingConfig: {
          primaryColor: '#007bff',
          secondaryColor: '#6c757d',
          companyName: 'AutoFlow RPA',
          logo: null
        },
        setBrandingConfig: (config) => 
          set(
            (state) => ({
              brandingConfig: { ...state.brandingConfig, ...config }
            }),
            false,
            'setBrandingConfig'
          ),

        // Workflows state
        workflows: [],
        workflowsLoading: false,
        workflowsError: null,
        setWorkflows: (workflows) => set({ workflows }, false, 'setWorkflows'),
        setWorkflowsLoading: (loading) => 
          set({ workflowsLoading: loading }, false, 'setWorkflowsLoading'),
        setWorkflowsError: (error) => 
          set({ workflowsError: error }, false, 'setWorkflowsError'),
        addWorkflow: (workflow) =>
          set(
            (state) => ({ workflows: [...state.workflows, workflow] }),
            false,
            'addWorkflow'
          ),
        updateWorkflow: (id, updates) =>
          set(
            (state) => ({
              workflows: state.workflows.map(w => 
                w.id === id ? { ...w, ...updates } : w
              )
            }),
            false,
            'updateWorkflow'
          ),
        removeWorkflow: (id) =>
          set(
            (state) => ({
              workflows: state.workflows.filter(w => w.id !== id)
            }),
            false,
            'removeWorkflow'
          ),

        // Toast notifications
        toasts: [],
        addToast: (toast) => {
          const id = Date.now().toString()
          const newToast = { id, ...toast }
          set(
            (state) => ({ toasts: [...state.toasts, newToast] }),
            false,
            'addToast'
          )
          return id
        },
        removeToast: (id) =>
          set(
            (state) => ({ toasts: state.toasts.filter(t => t.id !== id) }),
            false,
            'removeToast'
          ),
        clearToasts: () => set({ toasts: [] }, false, 'clearToasts'),

        // UI state
        sidebarOpen: false,
        toggleSidebar: () => 
          set((state) => ({ sidebarOpen: !state.sidebarOpen }), false, 'toggleSidebar'),
        setSidebarOpen: (open) => set({ sidebarOpen: open }, false, 'setSidebarOpen'),

        // Theme
        theme: 'light',
        setTheme: (theme) => set({ theme }, false, 'setTheme'),
        toggleTheme: () =>
          set(
            (state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' }),
            false,
            'toggleTheme'
          ),

        // Loading states
        globalLoading: false,
        setGlobalLoading: (loading) => 
          set({ globalLoading: loading }, false, 'setGlobalLoading'),

        // Error handling
        globalError: null,
        setGlobalError: (error) => set({ globalError: error }, false, 'setGlobalError'),
        clearGlobalError: () => set({ globalError: null }, false, 'clearGlobalError'),

        // Analytics/Stats
        stats: {
          totalWorkflows: 0,
          activeWorkflows: 0,
          successfulRuns: 0,
          failedRuns: 0
        },
        setStats: (stats) => set({ stats }, false, 'setStats'),
        updateStats: (updates) =>
          set(
            (state) => ({ stats: { ...state.stats, ...updates } }),
            false,
            'updateStats'
          ),

        // Actions
        showToast: (message, type = 'info', options = {}) => {
          const { addToast } = get()
          return addToast({
            message,
            type,
            duration: 5000,
            position: 'top-right',
            ...options
          })
        },

        showSuccess: (message, options = {}) => {
          const { showToast } = get()
          return showToast(message, 'success', options)
        },

        showError: (message, options = {}) => {
          const { showToast } = get()
          return showToast(message, 'error', options)
        },

        showWarning: (message, options = {}) => {
          const { showToast } = get()
          return showToast(message, 'warning', options)
        },

        // Reset store
        resetStore: () =>
          set(
            {
              workflows: [],
              workflowsLoading: false,
              workflowsError: null,
              toasts: [],
              sidebarOpen: false,
              globalLoading: false,
              globalError: null,
              stats: {
                totalWorkflows: 0,
                activeWorkflows: 0,
                successfulRuns: 0,
                failedRuns: 0
              }
            },
            false,
            'resetStore'
          ),
      })),
      {
        name: 'rpa-app-storage',
        partialize: (state) => ({
          brandingConfig: state.brandingConfig,
          theme: state.theme,
          sidebarOpen: state.sidebarOpen
        }),
      }
    ),
    {
      name: 'rpa-app-store',
    }
  )
)

// Selectors for better performance
export const useUser = () => useAppStore((state) => state.user)
export const useBrandingConfig = () => useAppStore((state) => state.brandingConfig)
export const useWorkflows = () => useAppStore((state) => ({
  workflows: state.workflows,
  loading: state.workflowsLoading,
  error: state.workflowsError
}))
export const useToasts = () => useAppStore((state) => state.toasts)
export const useTheme = () => useAppStore((state) => state.theme)
export const useStats = () => useAppStore((state) => state.stats)
export const useGlobalState = () => useAppStore((state) => ({
  loading: state.globalLoading,
  error: state.globalError
}))

export default useAppStore