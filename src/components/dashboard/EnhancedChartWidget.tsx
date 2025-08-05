import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, RefreshCw, Settings, Download } from 'lucide-react'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend } from 'chart.js'
import { Bar, Line, Pie, Doughnut } from 'react-chartjs-2'
import { supabase } from '@/integrations/supabase/client'
import type { Widget, QueryConfig } from '@/hooks/useDashboard'

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend)

interface EnhancedChartWidgetProps {
  widget: Widget
  onUpdate?: () => void
  onDelete?: () => void
  editMode?: boolean
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

const chartColors = [
  'rgba(59, 130, 246, 0.8)',   // Blue
  'rgba(16, 185, 129, 0.8)',   // Green
  'rgba(245, 158, 11, 0.8)',   // Yellow
  'rgba(239, 68, 68, 0.8)',    // Red
  'rgba(139, 92, 246, 0.8)',   // Purple
  'rgba(236, 72, 153, 0.8)',   // Pink
  'rgba(14, 165, 233, 0.8)',   // Sky
  'rgba(34, 197, 94, 0.8)',    // Emerald
]

const chartBorderColors = [
  'rgba(59, 130, 246, 1)',
  'rgba(16, 185, 129, 1)',
  'rgba(245, 158, 11, 1)',
  'rgba(239, 68, 68, 1)',
  'rgba(139, 92, 246, 1)',
  'rgba(236, 72, 153, 1)',
  'rgba(14, 165, 233, 1)',
  'rgba(34, 197, 94, 1)',
]

export const EnhancedChartWidget: React.FC<EnhancedChartWidgetProps> = ({
  widget,
  onUpdate,
  onDelete,
  editMode = false
}) => {
  const [chartData, setChartData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Direct fetch to widget-data function
  const fetchWidgetData = async (config: QueryConfig): Promise<WidgetDataResponse | null> => {
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

  // Default config if not set
  const chartConfig = {
    type: 'bar',
    showLegend: true,
    responsive: true,
    maintainAspectRatio: false,
    ...widget.config
  }

  const dataSource = widget.data_source as QueryConfig

  // Load data
  const loadData = async () => {
    if (!dataSource) return
    
    setIsRefreshing(true)
    setIsLoading(true)
    setError(null)
    
    try {
      const result = await fetchWidgetData(dataSource)
      if (result && result.labels && result.datasets) {
        // Enhance data with colors
        const enhancedData = {
          ...result,
          datasets: result.datasets.map((dataset: any, index: number) => ({
            ...dataset,
            backgroundColor: dataset.backgroundColor || chartColors,
            borderColor: dataset.borderColor || chartBorderColors[index % chartBorderColors.length],
            borderWidth: dataset.borderWidth || 1,
          }))
        }
        setChartData(enhancedData)
      } else {
        setError('No data available')
      }
    } catch (err: any) {
      console.error('Failed to load chart data:', err)
      setError('Failed to load chart data')
    } finally {
      setIsRefreshing(false)
      setIsLoading(false)
    }
  }

  // Load data on mount and when data source changes
  useEffect(() => {
    loadData()
  }, [dataSource])

  // Chart options
  const chartOptions = {
    responsive: chartConfig.responsive,
    maintainAspectRatio: chartConfig.maintainAspectRatio,
    plugins: {
      legend: {
        display: chartConfig.showLegend,
        position: 'bottom' as const,
      },
      title: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
      },
    },
    scales: chartConfig.type !== 'pie' && chartConfig.type !== 'doughnut' ? {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
      },
      x: {
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
      },
    } : {},
    animation: {
      duration: 750,
      easing: 'easeInOutQuart' as const,
    },
  }

  // Render chart based on type
  const renderChart = () => {
    if (!chartData) return null

    switch (chartConfig.type) {
      case 'line':
        return <Line data={chartData} options={chartOptions} />
      case 'pie':
        return <Pie data={chartData} options={chartOptions} />
      case 'doughnut':
        return <Doughnut data={chartData} options={chartOptions} />
      case 'bar':
      default:
        return <Bar data={chartData} options={chartOptions} />
    }
  }

  // Export chart data
  const exportData = () => {
    if (!chartData) return
    
    const csvContent = [
      ['Label', 'Value'],
      ...chartData.labels.map((label: string, index: number) => [
        label,
        chartData.datasets[0]?.data[index] || 0
      ])
    ].map(row => row.join(',')).join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${widget.title.replace(/\s+/g, '_')}_data.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{widget.title}</CardTitle>
        <div className="flex items-center space-x-1">
          {chartData?.total && (
            <Badge variant="secondary" className="text-xs">
              Total: {chartData.total.toLocaleString()}
            </Badge>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={loadData}
            disabled={isLoading || isRefreshing}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={exportData}
            disabled={!chartData}
            className="h-8 w-8 p-0"
          >
            <Download className="h-4 w-4" />
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
        <div className="h-64">
          {isLoading && !chartData ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full text-red-500">
              <p className="text-sm">Failed to load data</p>
            </div>
          ) : chartData ? (
            renderChart()
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              <p className="text-sm">No data available</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
