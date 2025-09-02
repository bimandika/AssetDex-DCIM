import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Loader2, 
  RefreshCw, 
  Settings, 
  Server, 
  Activity, 
  Zap, 
  Thermometer,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import type { Widget } from '@/hooks/useDashboard'
import { useAutoSave, useRestoreForm, useUrlState } from '@/hooks/useAutoSave'

interface ServerMetricWidgetProps {
  widget: Widget
  onUpdate?: () => void
  onDelete?: () => void
  editMode?: boolean
}

interface MetricData {
  label: string
  value: number
  total?: number
  percentage?: number
  trend?: 'up' | 'down' | 'stable'
  color: string
  icon: React.ReactNode
}

interface WidgetDataResponse {
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

const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`
  }
  return num.toString()
}

const getTrendIcon = (trend?: 'up' | 'down' | 'stable') => {
  switch (trend) {
    case 'up':
      return <TrendingUp className="h-3 w-3 text-green-500" />
    case 'down':
      return <TrendingDown className="h-3 w-3 text-red-500" />
    default:
      return <Minus className="h-3 w-3 text-gray-500" />
  }
}

export const ServerMetricWidget: React.FC<ServerMetricWidgetProps> = ({
  widget,
  onUpdate,
  onDelete,
  editMode = false
}) => {
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({})
  useUrlState(`${widget.id}_page`, page, setPage)
  useUrlState(`${widget.id}_filters`, filters, setFilters)

  const [metrics, setMetrics] = useState<MetricData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Direct fetch to widget-data function
  const fetchWidgetData = async (config: any): Promise<WidgetDataResponse | null> => {
    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      
      if (!token) {
        throw new Error('No authentication token available')
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL || 'http://localhost:8000'}/functions/v1/widget-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ config }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      return result.success ? result.data : null
    } catch (err: any) {
      console.error('Widget data fetch error:', err)
      setError(err.message)
      return null
    }
  }

  // Load server metrics
  const loadData = async () => {
    setIsRefreshing(true)
    setIsLoading(true)
    setError(null)
    
    try {
      const filters = widget.filters || []
      
      // Get server status metrics
      const serverData = await fetchWidgetData({
        table: 'servers',
        groupBy: 'status',
        aggregation: 'count',
        filters: filters
      })
      
      // Get deployment status  
      const deploymentData = await fetchWidgetData({
        table: 'servers',
        groupBy: 'deployment_status',
        aggregation: 'count',
        filters: filters
      })
      
      // Get rack utilization
      const rackData = await fetchWidgetData({
        action: 'rack_utilization',
        table: 'servers',
        filters: filters
      })
      
      const metricsArray: MetricData[] = []
      
      // Process server status data
      if (serverData && serverData.labels && serverData.datasets) {
        const total = serverData.total || 0
        serverData.labels.forEach((label: string, index: number) => {
          const value = serverData.datasets[0]?.data[index] || 0
          const percentage = total > 0 ? (value / total) * 100 : 0
          
          let color = 'bg-gray-500'
          let icon = <Server className="h-4 w-4" />
          
          switch (label?.toLowerCase() || '') {
            case 'active':
            case 'online':
              color = 'bg-green-500'
              icon = <Activity className="h-4 w-4" />
              break
            case 'maintenance':
            case 'updating':
              color = 'bg-yellow-500'
              icon = <Zap className="h-4 w-4" />
              break
            case 'offline':
            case 'failed':
              color = 'bg-red-500'
              icon = <Server className="h-4 w-4" />
              break
            case 'idle':
            case 'standby':
              color = 'bg-blue-500'
              break
          }
          
          metricsArray.push({
            label: `${label} Servers`,
            value,
            total,
            percentage: Math.round(percentage),
            color,
            icon,
          })
        })
      }
      
      // Process deployment status data
      if (deploymentData && deploymentData.labels && deploymentData.datasets) {
        const total = deploymentData.total || 0
        deploymentData.labels.forEach((label: string, index: number) => {
          const value = deploymentData.datasets[0]?.data[index] || 0
          const percentage = total > 0 ? (value / total) * 100 : 0
          
          let color = 'bg-purple-500'
          let icon = <Server className="h-4 w-4" />
          
          switch (label?.toLowerCase() || '') {
            case 'deployed':
            case 'production':
              color = 'bg-green-500'
              break
            case 'staging':
            case 'testing':
              color = 'bg-yellow-500'
              break
            case 'development':
              color = 'bg-blue-500'
              break
            case 'decommissioned':
              color = 'bg-gray-500'
              break
          }
          
          metricsArray.push({
            label: `${label} Deployment`,
            value,
            total,
            percentage: Math.round(percentage),
            color,
            icon,
          })
        })
      }
      
      // Process rack utilization data
      if (rackData && rackData.datasets) {
        rackData.datasets.forEach((dataset: any) => {
          if (dataset.label === 'Utilization') {
            const avgUtilization = dataset.data.reduce((a: number, b: number) => a + b, 0) / dataset.data.length
            
            metricsArray.push({
              label: 'Avg Rack Utilization',
              value: Math.round(avgUtilization),
              percentage: Math.round(avgUtilization),
              color: avgUtilization > 80 ? 'bg-red-500' : avgUtilization > 60 ? 'bg-yellow-500' : 'bg-green-500',
              icon: <Thermometer className="h-4 w-4" />,
            })
          }
        })
      }
      
      setMetrics(metricsArray)
    } catch (err) {
      console.error('Failed to load server metrics:', err)
      setError('Failed to load server metrics')
    } finally {
      setIsRefreshing(false)
      setIsLoading(false)
    }
  }

  // Load data on mount and when filters change
  useEffect(() => {
    loadData()
  }, [widget.filters])

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{widget.title}</CardTitle>
        <div className="flex items-center space-x-1">
          <Badge variant="secondary" className="text-xs">
            {metrics.length} metrics
          </Badge>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={loadData}
            disabled={isLoading || isRefreshing}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
          
          {editMode && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onUpdate && onUpdate()}
                className="h-8 w-8 p-0"
              >
                <Settings className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onDelete}
                className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
              >
                ×
              </Button>
            </>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="p-4">
        <div className="space-y-4">
          {isLoading && metrics.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-32 text-red-500">
              <p className="text-sm">Failed to load metrics</p>
            </div>
          ) : metrics.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-gray-400">
              <p className="text-sm">No metrics available</p>
            </div>
          ) : (
            metrics.map((metric, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`p-1 rounded ${metric.color} text-white`}>
                      {metric.icon}
                    </div>
                    <span className="font-medium text-sm">{metric.label}</span>
                    {metric.trend && getTrendIcon(metric.trend)}
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg">{formatNumber(metric.value)}</div>
                    {metric.total && (
                      <div className="text-xs text-muted-foreground">
                        of {formatNumber(metric.total)}
                      </div>
                    )}
                  </div>
                </div>
                
                {metric.percentage !== undefined && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Progress</span>
                      <span>{metric.percentage}%</span>
                    </div>
                    <Progress value={metric.percentage} className="h-2" />
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
