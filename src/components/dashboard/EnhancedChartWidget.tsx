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
      // Extract groupFields and filters from config
      const groupFields = config.groupBy ? [config.groupBy] : (config.groupFields || ['brand', 'model', 'status']);
      const filters = config.filters || [];
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL || 'http://localhost:8000'}/functions/v1/chart-widget-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ groupFields, filters }),
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

  // Chart options object (move outside loadData)
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

  // Load data
  const loadData = async () => {
    if (!dataSource) return

    setIsRefreshing(true)
    setIsLoading(true)
    setError(null)

    try {
      const backendData = await fetchWidgetData(dataSource);
      // Debug: show raw backend data
      (window as any).lastChartWidgetRawData = backendData;
      // If result is an array of objects, transform to Chart.js format
      if (Array.isArray(backendData) && backendData.length > 0 && typeof backendData[0] === 'object') {
        // Use first key as label, second as value
        const labelKey = Object.keys(backendData[0]).find(k => k !== 'count') || Object.keys(backendData[0])[0];
        const valueKey = 'count';
        const labels = backendData.map((item: any) => item[labelKey]);
        const data = backendData.map((item: any) => item[valueKey]);
        const datasets = [{
          label: labelKey,
          data,
          backgroundColor: chartColors,
          borderColor: chartBorderColors[0],
          borderWidth: 1,
        }];
        setChartData({ labels, datasets });
      } else if (backendData && backendData.labels && backendData.datasets) {
        // Enhance data with colors
        const enhancedData = {
          ...backendData,
          datasets: backendData.datasets.map((dataset: any, index: number) => ({
            ...dataset,
            backgroundColor: dataset.backgroundColor || chartColors,
            borderColor: dataset.borderColor || chartBorderColors[index % chartBorderColors.length],
            borderWidth: dataset.borderWidth || 1,
          }))
        };
        setChartData(enhancedData);
      } else {
        setError('No data available');
      }
    } catch (err: any) {
      console.error('Failed to load chart data:', err);
      setError('Failed to load chart data');
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  }

  // Render chart based on type
  // ...existing code...

  // Export chart data
  const exportData = () => {
    if (!chartData) return
    // Simple CSV export
    const rows = [
      ['Label', ...chartData.labels],
      ...chartData.datasets.map((ds: any) => [ds.label, ...ds.data])
    ]
    const csvContent = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${widget.title || 'chart-data'}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Load data on mount
  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(widget.config), JSON.stringify(widget.data_source)])

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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between p-4">
        <CardTitle className="text-lg font-semibold">{widget.title || 'Chart Widget'}</CardTitle>
        <div className="flex gap-2 items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={loadData}
            disabled={isRefreshing}
            className="h-8 w-8 p-0"
            title="Refresh"
          >
            <RefreshCw className={isRefreshing ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={exportData}
            disabled={!chartData}
            className="h-8 w-8 p-0"
            title="Export CSV"
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
                title="Edit"
              >
                <Settings className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onDelete}
                className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                title="Delete"
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
