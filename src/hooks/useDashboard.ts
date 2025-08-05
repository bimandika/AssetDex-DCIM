import { useState, useEffect } from 'react'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { ServerFilterConfig, EnhancedQueryConfig } from '@/types/filterTypes'

export interface Dashboard {
  id: string
  name: string
  description?: string
  layout: any[]
  filters: any
  settings: any
  status: 'active' | 'archived' | 'draft'
  is_public: boolean
  created_at: string
  updated_at: string
  dashboard_widgets?: Widget[]
}

export interface Widget {
  id: string
  dashboard_id: string
  widget_type: 'metric' | 'chart' | 'table' | 'timeline' | 'stat' | 'gauge'
  title: string
  position_x: number
  position_y: number
  width: number
  height: number
  config: any
  data_source: any
  filters: any[]
  // Enhanced server filtering support
  server_filters?: ServerFilterConfig
  created_at: string
  updated_at: string
}

export interface QueryConfig {
  table: string
  groupBy?: string
  aggregation?: 'count' | 'sum' | 'avg' | 'min' | 'max'
  filters?: FilterConfig[]
  dateRange?: {
    field: string
    start: string
    end: string
  }
}

export interface FilterConfig {
  field: string
  operator: 'equals' | 'contains' | 'in' | 'gt' | 'lt' | 'gte' | 'lte'
  value: string | string[] | number
}

export const useDashboard = () => {
  const [dashboards, setDashboards] = useState<Dashboard[]>([])
  const [currentDashboard, setCurrentDashboard] = useState<Dashboard | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  // List all dashboards
  const listDashboards = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      console.log('useDashboard: Starting dashboard list request')
      
      // Get current session for auth token
      const { data: { session } } = await supabase.auth.getSession();
      
      // Use fetch directly with action parameter
      const url = new URL('http://localhost:8000/functions/v1/dashboard-manager')
      url.searchParams.set('action', 'list')
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      
      // Add auth header if we have a session
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log('useDashboard: List dashboards response:', data)

      // Handle dashboards response
      if (data && data.dashboards !== undefined) {
        console.log('useDashboard: Found dashboards array:', data.dashboards.length)
        setDashboards(data.dashboards || [])
        return data.dashboards
      } else if (data.error) {
        throw new Error(data.error)
      } else {
        console.error('useDashboard: Unexpected response format:', data)
        throw new Error('Failed to load dashboards - unexpected response format')
      }
      
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to load dashboards'
      console.error('useDashboard: Error in listDashboards:', errorMessage, err)
      setError(errorMessage)
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      })
      return []
    } finally {
      setIsLoading(false)
    }
  }

  // Get specific dashboard
  const getDashboard = async (id: string) => {
    setIsLoading(true)
    setError(null)
    
    try {
      console.log('useDashboard: Getting dashboard with ID:', id)
      
      // Get current session for auth token
      const { data: { session } } = await supabase.auth.getSession();
      
      // Use fetch directly with ID as URL parameter
      const url = new URL('http://localhost:8000/functions/v1/dashboard-manager')
      url.searchParams.set('action', 'get')
      url.searchParams.set('id', id)
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      
      // Add auth header if we have a session
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log('useDashboard: Get dashboard response:', data)
      console.log('useDashboard: Dashboard data:', data.dashboard)
      console.log('useDashboard: Dashboard widgets:', data.dashboard?.dashboard_widgets)

      if (data.dashboard) {
        setCurrentDashboard(data.dashboard)
        return data.dashboard
      } else if (data.error) {
        throw new Error(data.error)
      } else {
        throw new Error('Dashboard not found')
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to load dashboard'
      console.error('useDashboard: Error in getDashboard:', errorMessage, err)
      setError(errorMessage)
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      })
      return null
    } finally {
      setIsLoading(false)
    }
  }

  // Create new dashboard
  const createDashboard = async (config: {
    name: string
    description?: string
    layout?: any[]
  }) => {
    setIsLoading(true)
    setError(null)
    
    try {
      console.log('useDashboard: Creating dashboard with config:', config)
      
      // Get current session for auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Authentication required. Please sign in.');
      }

      // Use fetch directly instead of supabase.functions.invoke to ensure body is sent
      const response = await fetch('http://localhost:8000/functions/v1/dashboard-manager', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(config)
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      const error = null // No error if we got here

      console.log('useDashboard: Create dashboard response:', { data, error })

      if (error) {
        console.error('useDashboard: Create dashboard function error:', error)
        throw error
      }

      // Handle success response
      if (data && (data.dashboard || data.message)) {
        toast({
          title: 'Success',
          description: data.message || 'Dashboard created successfully',
        })
        
        // Refresh dashboard list
        await listDashboards()
        return data.dashboard
      } else if (data && data.error) {
        throw new Error(data.error)
      } else {
        throw new Error('Failed to create dashboard - unexpected response')
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to create dashboard'
      console.error('useDashboard: Create dashboard error:', errorMessage, err)
      setError(errorMessage)
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      })
      return null
    } finally {
      setIsLoading(false)
    }
  }

  // Update dashboard
  const updateDashboard = async (id: string, config: Partial<Dashboard>) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const { data, error } = await supabase.functions.invoke('dashboard-manager', {
        method: 'POST',
        body: {
          action: 'update',
          payload: { id, ...config }
        }
      })

      if (error) throw error

      if (data.success) {
        toast({
          title: 'Success',
          description: 'Dashboard updated successfully',
        })
        
        // Update current dashboard if it matches
        if (currentDashboard?.id === id) {
          setCurrentDashboard({ ...currentDashboard, ...config })
        }
        
        // Refresh dashboard list
        await listDashboards()
        return true
      } else {
        throw new Error(data.error || 'Failed to update dashboard')
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to update dashboard'
      setError(errorMessage)
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      })
      return false
    } finally {
      setIsLoading(false)
    }
  }

  // Delete dashboard
  const deleteDashboard = async (id: string) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const { data, error } = await supabase.functions.invoke('dashboard-manager', {
        method: 'POST',
        body: {
          action: 'delete',
          payload: { id }
        }
      })

      if (error) throw error

      if (data.success) {
        toast({
          title: 'Success',
          description: 'Dashboard deleted successfully',
        })
        
        // Clear current dashboard if it matches
        if (currentDashboard?.id === id) {
          setCurrentDashboard(null)
        }
        
        // Refresh dashboard list
        await listDashboards()
        return true
      } else {
        throw new Error(data.error || 'Failed to delete dashboard')
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to delete dashboard'
      setError(errorMessage)
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      })
      return false
    } finally {
      setIsLoading(false)
    }
  }

  // Create widget
  const createWidget = async (dashboardId: string, widget: Partial<Widget>) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const { data, error } = await supabase.functions.invoke('dashboard-manager', {
        method: 'POST',
        body: {
          action: 'create_widget',
          payload: {
            dashboard_id: dashboardId,
            ...widget
          }
        }
      })

      if (error) throw error

      if (data.success) {
        toast({
          title: 'Success',
          description: 'Widget created successfully',
        })
        
        // Refresh current dashboard
        if (currentDashboard?.id === dashboardId) {
          await getDashboard(dashboardId)
        }
        
        return data.data
      } else {
        throw new Error(data.error || 'Failed to create widget')
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to create widget'
      setError(errorMessage)
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      })
      return null
    } finally {
      setIsLoading(false)
    }
  }

  // Update widget
  const updateWidget = async (widgetId: string, widget: Partial<Widget>) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const { data, error } = await supabase.functions.invoke('dashboard-manager', {
        method: 'POST',
        body: {
          action: 'update_widget',
          payload: {
            id: widgetId,
            ...widget
          }
        }
      })

      if (error) throw error

      if (data.success) {
        toast({
          title: 'Success',
          description: 'Widget updated successfully',
        })
        
        // Refresh current dashboard if widget belongs to it
        if (currentDashboard) {
          await getDashboard(currentDashboard.id)
        }
        
        return true
      } else {
        throw new Error(data.error || 'Failed to update widget')
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to update widget'
      setError(errorMessage)
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      })
      return false
    } finally {
      setIsLoading(false)
    }
  }

  // Delete widget
  const deleteWidget = async (widgetId: string) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const { data, error } = await supabase.functions.invoke('dashboard-manager', {
        method: 'POST',
        body: {
          action: 'delete_widget',
          payload: { id: widgetId }
        }
      })

      if (error) throw error

      if (data.success) {
        toast({
          title: 'Success',
          description: 'Widget deleted successfully',
        })
        
        // Refresh current dashboard
        if (currentDashboard) {
          await getDashboard(currentDashboard.id)
        }
        
        return true
      } else {
        throw new Error(data.error || 'Failed to delete widget')
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to delete widget'
      setError(errorMessage)
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      })
      return false
    } finally {
      setIsLoading(false)
    }
  }

  // Load dashboards on mount
  useEffect(() => {
    listDashboards()
  }, [])

  return {
    dashboards,
    currentDashboard,
    isLoading,
    error,
    listDashboards,
    getDashboard,
    createDashboard,
    updateDashboard,
    deleteDashboard,
    createWidget,
    updateWidget,
    deleteWidget,
    setCurrentDashboard
  }
}
