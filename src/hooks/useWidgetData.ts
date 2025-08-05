import { useState } from 'react'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { executeServerQuery, QueryBuilderOptions } from '@/utils/queryBuilder'
import { ServerFilterConfig, EnhancedQueryConfig } from '@/types/filterTypes'
import type { QueryConfig, FilterConfig } from './useDashboard'

export interface WidgetData {
  labels: string[]
  datasets: Array<{
    label: string
    data: number[]
    backgroundColor?: string[]
    borderColor?: string
    borderWidth?: number
  }>
  total?: number
  metadata?: any
}

export interface TimelineEvent {
  id: string
  title: string
  description: string
  timestamp: string
  category: string
  server_id?: string
  server_name?: string
  rack_name?: string
  room_name?: string
}

export const useWidgetData = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  // Query widget data
  const queryData = async (config: QueryConfig): Promise<WidgetData | null> => {
    setIsLoading(true)
    setError(null)
    
    try {
      const { data, error } = await supabase.functions.invoke('widget-data', {
        method: 'POST',
        body: {
          action: 'query',
          config
        }
      })

      if (error) throw error

      if (data.success) {
        return data.data
      } else {
        throw new Error(data.error || 'Failed to query data')
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to query data'
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
  // Enhanced query data with server filtering support
  const queryEnhancedData = async (config: EnhancedQueryConfig): Promise<WidgetData | null> => {
    setIsLoading(true)
    setError(null)
    
    try {
      if (config.table === 'servers' && config.serverFilters) {
        // Use enhanced server filtering
        const queryOptions: QueryBuilderOptions = {
          table: config.table,
          serverFilters: config.serverFilters,
          aggregation: config.aggregation,
          groupBy: config.groupBy,
          orderBy: config.groupBy,
          limit: 100
        }

        const result = await executeServerQuery(queryOptions)
        
        if (result.error) {
          throw new Error(result.error)
        }

        // Transform data for widget consumption
        return transformQueryResult(result.data, config)
      } else {
        // Fall back to original query method for non-server tables
        return queryData({
          table: config.table,
          groupBy: config.groupBy,
          aggregation: config.aggregation,
          filters: config.basicFilters?.map(f => ({
            field: f.field,
            operator: f.operator,
            value: f.value
          })) || [],
          dateRange: config.dateRange
        })
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to query enhanced data'
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

  // Transform query result into widget data format
  const transformQueryResult = (data: any[], config: EnhancedQueryConfig): WidgetData => {
    if (!data || data.length === 0) {
      return {
        labels: [],
        datasets: [{
          label: 'No Data',
          data: [],
          backgroundColor: ['#e5e7eb'],
        }],
        total: 0
      }
    }

    if (config.groupBy) {
      // Grouped data
      const labels = data.map(item => item[config.groupBy!] || 'Unknown')
      const values = data.map(item => item.count || 0)
      
      return {
        labels,
        datasets: [{
          label: config.aggregation === 'count' ? 'Count' : config.aggregation || 'Value',
          data: values,
          backgroundColor: generateColors(labels.length),
        }],
        total: values.reduce((sum, val) => sum + val, 0)
      }
    } else {
      // Simple count
      return {
        labels: ['Total'],
        datasets: [{
          label: 'Count',
          data: [data.length],
          backgroundColor: ['#3b82f6'],
        }],
        total: data.length
      }
    }
  }

  // Generate colors for chart data
  const generateColors = (count: number): string[] => {
    const colors = [
      '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
      '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
    ]
    
    const result = []
    for (let i = 0; i < count; i++) {
      result.push(colors[i % colors.length])
    }
    return result
  }

  // Get timeline data
  const getTimelineData = async (filters?: FilterConfig[]): Promise<TimelineEvent[]> => {
    setIsLoading(true)
    setError(null)
    
    try {
      const { data, error } = await supabase.functions.invoke('widget-data', {
        method: 'POST',
        body: {
          action: 'timeline',
          filters: filters || []
        }
      })

      if (error) throw error

      if (data.success) {
        return data.data || []
      } else {
        throw new Error(data.error || 'Failed to get timeline data')
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to get timeline data'
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

  // Get server metrics data
  const getServerMetrics = async (filters?: FilterConfig[]): Promise<WidgetData | null> => {
    return queryData({
      table: 'servers',
      groupBy: 'status',
      aggregation: 'count',
      filters: filters || []
    })
  }

  // Get deployment status data
  const getDeploymentStatus = async (filters?: FilterConfig[]): Promise<WidgetData | null> => {
    return queryData({
      table: 'servers',
      groupBy: 'deployment_status',
      aggregation: 'count',
      filters: filters || []
    })
  }

  // Get servers by location
  const getServersByLocation = async (groupBy: 'room' | 'rack' = 'room', filters?: FilterConfig[]): Promise<WidgetData | null> => {
    return queryData({
      table: 'servers',
      groupBy: groupBy === 'room' ? 'room_name' : 'rack_name',
      aggregation: 'count',
      filters: filters || []
    })
  }

  // Get servers by hardware type
  const getServersByHardware = async (filters?: FilterConfig[]): Promise<WidgetData | null> => {
    return queryData({
      table: 'servers',
      groupBy: 'hardware_type',
      aggregation: 'count',
      filters: filters || []
    })
  }

  // Get servers created over time
  const getServersOverTime = async (
    period: 'day' | 'week' | 'month' = 'month',
    filters?: FilterConfig[]
  ): Promise<WidgetData | null> => {
    const dateRange = getDateRange(period)
    
    return queryData({
      table: 'servers',
      groupBy: period,
      aggregation: 'count',
      filters: filters || [],
      dateRange: {
        field: 'created_at',
        start: dateRange.start,
        end: dateRange.end
      }
    })
  }

  // Get rack utilization data
  const getRackUtilization = async (filters?: FilterConfig[]): Promise<WidgetData | null> => {
    setIsLoading(true)
    setError(null)
    
    try {
      const { data, error } = await supabase.functions.invoke('widget-data', {
        method: 'POST',
        body: {
          action: 'rack_utilization',
          filters: filters || []
        }
      })

      if (error) throw error

      if (data.success) {
        return data.data
      } else {
        throw new Error(data.error || 'Failed to get rack utilization data')
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to get rack utilization data'
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

  // Helper function to get date range
  const getDateRange = (period: 'day' | 'week' | 'month') => {
    const end = new Date()
    const start = new Date()
    
    switch (period) {
      case 'day':
        start.setDate(start.getDate() - 30) // Last 30 days
        break
      case 'week':
        start.setDate(start.getDate() - 12 * 7) // Last 12 weeks
        break
      case 'month':
        start.setMonth(start.getMonth() - 12) // Last 12 months
        break
    }
    
    return {
      start: start.toISOString(),
      end: end.toISOString()
    }
  }

  return {
    isLoading,
    error,
    queryData,
    queryEnhancedData,
    getTimelineData,
    getServerMetrics,
    getDeploymentStatus,
    getServersByLocation,
    getServersByHardware,
    getServersOverTime,
    getRackUtilization
  }
}
