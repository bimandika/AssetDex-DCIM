import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Plus, 
  Layout, 
  Edit, 
  Save, 
  X, 
  Share2,
  Download,
  Grid
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useDashboard } from '@/hooks/useDashboard'
import { EnhancedChartWidget } from './EnhancedChartWidget'
import { TimelineWidget } from './TimelineWidget'
import { ServerMetricWidget } from './ServerMetricWidget'
import { SimpleMetricWidget } from './SimpleMetricWidget'
import WidgetEditDialog from './WidgetEditDialog'
import type { Widget } from '@/hooks/useDashboard'

interface CustomDashboardProps {
  dashboardId?: string
}

const GRID_COLS = 12
const WIDGET_HEIGHT = 300

const CustomDashboard: React.FC<CustomDashboardProps> = ({ dashboardId }) => {
  const { toast } = useToast()
  const {
    dashboards,
    currentDashboard,
    getDashboard,
    createDashboard,
    updateDashboard,
    createWidget,
    updateWidget,
    deleteWidget,
    setCurrentDashboard,
    isLoading
  } = useDashboard()
  
  const [editMode, setEditMode] = useState(false)
  const [dashboardName, setDashboardName] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingWidget, setEditingWidget] = useState<Widget | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)

  // Load dashboard on mount
  useEffect(() => {
    if (dashboardId) {
      getDashboard(dashboardId)
    }
  }, [dashboardId])

  // Update dashboard name when dashboard changes
  useEffect(() => {
    if (currentDashboard) {
      setDashboardName(currentDashboard.name)
    }
  }, [currentDashboard])

  // Create new dashboard
  const handleCreateDashboard = async () => {
    const name = dashboardName.trim() || 'New Dashboard'
    const result = await createDashboard({
      name,
      description: 'Custom server tracking dashboard',
      layout: []
    })
    
    if (result) {
      setEditMode(true)
      toast({
        title: 'Success',
        description: `Dashboard "${name}" created successfully`,
      })
    }
  }

  // Save dashboard changes
  const handleSaveDashboard = async () => {
    if (!currentDashboard) return
    
    const success = await updateDashboard(currentDashboard.id, {
      name: dashboardName,
      updated_at: new Date().toISOString()
    })
    
    if (success) {
      setEditMode(false)
      toast({
        title: 'Success',
        description: 'Dashboard saved successfully',
      })
    }
  }

  // Add new widget
  const handleAddWidget = async (type: 'metric' | 'chart' | 'table' | 'timeline') => {
    if (!currentDashboard) return

    // Find available position
    const widgets = currentDashboard.dashboard_widgets || []
    const occupiedPositions = widgets.map(w => ({ x: w.position_x, y: w.position_y, width: w.width, height: w.height }))
    
    let position = { x: 0, y: 0 }
    let found = false
    
    // Simple positioning logic - find first available spot
    for (let y = 0; y < 10 && !found; y++) {
      for (let x = 0; x <= GRID_COLS - 4 && !found; x++) {
        const conflicts = occupiedPositions.some(pos => 
          x < pos.x + pos.width && x + 4 > pos.x && 
          y < pos.y + pos.height && y + 1 > pos.y
        )
        
        if (!conflicts) {
          position = { x, y }
          found = true
        }
      }
    }

    const widgetConfig = {
      widget_type: type,
      title: `${type.charAt(0).toUpperCase() + type.slice(1)} Widget`,
      position_x: position.x,
      position_y: position.y,
      width: type === 'timeline' ? 6 : 4,
      height: 1,
      config: getDefaultWidgetConfig(type),
      data_source: getDefaultDataSource(type),
      filters: []
    }

    await createWidget(currentDashboard.id, widgetConfig)
  }

  // Get default widget configuration
  const getDefaultWidgetConfig = (type: string) => {
    switch (type) {
      case 'chart':
        return { type: 'bar', showLegend: true }
      case 'metric':
        return { showTrend: true, showProgress: true }
      case 'timeline':
        return { maxEvents: 10, groupBy: 'day' }
      default:
        return {}
    }
  }

  // Get default data source
  const getDefaultDataSource = (type: string) => {
    switch (type) {
      case 'chart':
        return {
          table: 'servers',
          groupBy: 'status',
          aggregation: 'count'
        }
      case 'metric':
        return {
          table: 'servers',
          aggregation: 'count'
        }
      case 'timeline':
        return {
          table: 'servers',
          orderBy: 'created_at'
        }
      default:
        return {}
    }
  }

  // Render widget based on type
  // Handle widget edit
  const handleEditWidget = (widget: Widget) => {
    setEditingWidget(widget)
    setShowEditDialog(true)
  }

  // Handle widget update from edit dialog
  const handleUpdateWidget = async (widgetData: Partial<Widget>) => {
    if (!editingWidget) return
    await updateWidget(editingWidget.id, widgetData)
  }

  const renderWidget = (widget: Widget) => {
    const commonProps = {
      widget,
      onUpdate: () => handleEditWidget(widget), // Changed to open edit dialog
      onDelete: () => deleteWidget(widget.id),
      editMode
    }

    switch (widget.widget_type) {
      case 'chart':
        return <EnhancedChartWidget {...commonProps} />
      case 'timeline':
        return <TimelineWidget {...commonProps} />
      case 'metric':
        return <SimpleMetricWidget {...commonProps} />
      default:
        return (
          <Card className="h-full">
            <CardContent className="p-4 flex items-center justify-center">
              <p className="text-sm text-muted-foreground">
                Unsupported widget type: {widget.widget_type}
              </p>
            </CardContent>
          </Card>
        )
    }
  }

  // Handle dashboard selection
  const handleSelectDashboard = async (dashboard: any) => {
    await getDashboard(dashboard.id)
  }

  // Calculate grid style for widget
  const getWidgetStyle = (widget: Widget) => ({
    gridColumn: `span ${widget.width}`,
    gridRow: `span ${widget.height}`,
    minHeight: `${WIDGET_HEIGHT * widget.height}px`,
  })

  // Show dashboard list if no specific dashboard is selected
  if (!dashboardId && !currentDashboard && !showCreateForm) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <Layout className="h-6 w-6" />
                <span>Custom Dashboards</span>
              </CardTitle>
              <Button onClick={() => setShowCreateForm(true)} className="flex items-center space-x-2">
                <Plus className="h-4 w-4" />
                <span>Create New</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Loading dashboards...</div>
            ) : dashboards.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Layout className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">No dashboards found</p>
                <p className="text-sm">Create your first custom dashboard to get started</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {dashboards.map((dashboard) => (
                  <Card
                    key={dashboard.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => handleSelectDashboard(dashboard)}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">{dashboard.name}</CardTitle>
                      {dashboard.description && (
                        <CardDescription className="text-sm">
                          {dashboard.description}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex items-center space-x-2">
                          <Badge variant="secondary" className="text-xs">
                            {dashboard.status}
                          </Badge>
                          {dashboard.is_public && (
                            <Badge variant="outline" className="text-xs">
                              Public
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center space-x-1">
                          <Grid className="h-4 w-4" />
                          <span>
                            {(dashboard.dashboard_widgets as any)?.[0]?.count || 0} widgets
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        Updated {new Date(dashboard.updated_at).toLocaleDateString()}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show create form
  if (showCreateForm && !currentDashboard) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center space-x-2">
              <Layout className="h-6 w-6" />
              <span>Create Custom Dashboard</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Dashboard Name</label>
              <Input
                placeholder="Enter dashboard name..."
                value={dashboardName}
                onChange={(e) => setDashboardName(e.target.value)}
                className="max-w-md mx-auto"
              />
            </div>
            <div className="flex justify-center space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setShowCreateForm(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateDashboard} disabled={isLoading}>
                <Plus className="h-4 w-4 mr-2" />
                Create Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!currentDashboard && !editMode) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center space-x-2">
              <Layout className="h-6 w-6" />
              <span>Create Custom Dashboard</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Dashboard Name</label>
              <Input
                placeholder="Enter dashboard name..."
                value={dashboardName}
                onChange={(e) => setDashboardName(e.target.value)}
                className="max-w-md mx-auto"
              />
            </div>
            <div className="flex justify-center">
              <Button onClick={handleCreateDashboard} disabled={isLoading}>
                <Plus className="h-4 w-4 mr-2" />
                Create Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-full p-6">
      {/* Dashboard Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          {editMode ? (
            <Input
              value={dashboardName}
              onChange={(e) => setDashboardName(e.target.value)}
              className="text-2xl font-bold border-none p-0 h-auto"
            />
          ) : (
            <h1 className="text-2xl font-bold">{currentDashboard?.name}</h1>
          )}
          
          <Badge variant="outline">
            {currentDashboard?.dashboard_widgets?.length || 0} widgets
          </Badge>
        </div>

        <div className="flex items-center space-x-2">
          {editMode ? (
            <>
              <Button variant="outline" size="sm" onClick={() => setEditMode(false)}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button size="sm" onClick={handleSaveDashboard}>
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm">
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button variant="outline" size="sm" onClick={() => setEditMode(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Add Widget Controls */}
      {editMode && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-2 mb-3">
            <Plus className="h-4 w-4" />
            <span className="font-medium">Add Widget</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => handleAddWidget('chart')}>
              Chart Widget
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleAddWidget('metric')}>
              Metrics Widget
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleAddWidget('timeline')}>
              Timeline Widget
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleAddWidget('table')}>
              Table Widget
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleAddWidget('stat')}>
              Stat Widget
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleAddWidget('gauge')}>
              Gauge Widget
            </Button>
          </div>
        </div>
      )}

      {/* Widgets Grid */}
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)` }}>
        {currentDashboard?.dashboard_widgets?.map((widget) => (
          <div key={widget.id} style={getWidgetStyle(widget)}>
            {renderWidget(widget)}
          </div>
        ))}
      </div>

      {/* Empty State */}
      {(!currentDashboard?.dashboard_widgets || currentDashboard.dashboard_widgets.length === 0) && (
        <div className="text-center py-12">
          <Grid className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium mb-2">No widgets yet</h3>
          <p className="text-muted-foreground mb-4">
            {editMode 
              ? 'Add your first widget to get started' 
              : 'Switch to edit mode to add widgets'
            }
          </p>
          {!editMode && (
            <Button onClick={() => setEditMode(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Start Editing
            </Button>
          )}
        </div>
      )}
      
      {/* Widget Edit Dialog */}
      <WidgetEditDialog
        widget={editingWidget}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onSave={handleUpdateWidget}
      />
    </div>
  )
}

export default CustomDashboard
