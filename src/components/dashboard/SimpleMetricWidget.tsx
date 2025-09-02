import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Loader2, 
  RefreshCw, 
  Settings, 
  Server, 
  Activity, 
  Zap,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react'
import { useWidgetData } from '@/hooks/useWidgetData'
import { EnhancedQueryConfig } from '@/types/filterTypes'
import type { Widget } from '@/hooks/useDashboard'
import { useAutoSave, useRestoreForm, useUrlState } from '@/hooks/useAutoSave'

interface SimpleMetricWidgetProps {
  widget: Widget
  onUpdate?: () => void
  onDelete?: () => void
  editMode?: boolean
}

interface MetricData {
  label: string
  value: number
  icon: React.ReactNode
  color: string
  trend?: 'up' | 'down' | 'stable'
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

export const SimpleMetricWidget: React.FC<SimpleMetricWidgetProps> = ({
  widget,
  onUpdate,
  onDelete,
  editMode = false
}) => {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({});
  useUrlState(`${widget.id}_page`, page, setPage);
  useUrlState(`${widget.id}_filters`, filters, setFilters);

  const [metric, setMetric] = useState<MetricData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { queryEnhancedData, isLoading } = useWidgetData()

  // Load metric data based on widget configuration
  const loadData = async () => {
    setError(null)

    try {
      const dataSource = widget.data_source as any

      if (!dataSource) {
        throw new Error('No data source configured')
      }

      // Build enhanced query config
      const queryConfig: EnhancedQueryConfig = {
        table: dataSource.table || 'servers',
        aggregation: dataSource.aggregation || 'count',
        groupBy: dataSource.groupBy
      }

      // Merge all filters: widget.filters, data_source.filters, server_filters
      let allFilters: any[] = []
      if (Array.isArray(widget.filters)) {
        allFilters = allFilters.concat(widget.filters)
      }
      if (Array.isArray(dataSource.filters)) {
        allFilters = allFilters.concat(dataSource.filters)
      }
      if (Array.isArray(widget.server_filters)) {
        allFilters = allFilters.concat(widget.server_filters)
      }
      if (allFilters.length > 0) {
        queryConfig.basicFilters = allFilters.map((filter: any) => ({
          field: filter.field,
          operator: filter.operator || 'equals',
          value: filter.value
        }))
      }

      const result = await queryEnhancedData(queryConfig)

      if (!result) {
        throw new Error('No data returned')
      }

      // Extract count from the response
      const count = result.total ?? result.value ?? 0

      // Determine icon and color based on widget title and filters
      let icon = <Server className="h-6 w-6" />
      let color = 'bg-blue-500'

      if (widget.title.toLowerCase().includes('active')) {
        icon = <Activity className="h-6 w-6" />
        color = 'bg-green-500'
      } else if (widget.title.toLowerCase().includes('production')) {
        icon = <Server className="h-6 w-6" />
        color = 'bg-green-500'
      } else if (widget.title.toLowerCase().includes('ready')) {
        icon = <Zap className="h-6 w-6" />
        color = 'bg-yellow-500'
      } else if (widget.title.toLowerCase().includes('total')) {
        icon = <Server className="h-6 w-6" />
        color = 'bg-blue-500'
      }

      setMetric({
        label: widget.title,
        value: count,
        icon,
        color
      })

    } catch (err: any) {
      console.error('Failed to load metric data:', err)
      setError('Failed to load metric data')
    }
  }

  // Load data on mount and when filters change
  useEffect(() => {
    loadData()
  }, [widget.filters, widget.server_filters, widget.data_source])

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{widget.title}</CardTitle>
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={loadData}
            disabled={isLoading}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
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
      
      <CardContent className="p-6">
        {isLoading && !metric ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-32 text-red-500">
            <p className="text-sm">Failed to load metric</p>
          </div>
        ) : metric ? (
          <div className="relative flex flex-col h-32">
            {/* Main number centered in upper area */}
            <div className="flex-1 flex items-center justify-center" style={{ paddingTop: '30px', paddingBottom: '30px' }}>
              <div className="text-8xl font-bold">{formatNumber(metric.value)}</div>
            </div>
            
            {/* Icon and label at bottom */}
            <div className="flex items-center justify-between px-2 pb-2">
              <p className="text-sm text-muted-foreground">
                {metric.label}
              </p>
              <div className={`p-2 rounded-lg ${metric.color} text-white`}>
                <div className="h-4 w-4">
                  {metric.icon}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-32 text-gray-400">
            <p className="text-sm">No data available</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
