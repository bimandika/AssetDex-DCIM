import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { ServerFilterConfig, FilterValidationResult } from '@/types/filterTypes'
import ServerFilterComponent from './ServerFilterComponent'
import type { Widget } from '@/hooks/useDashboard'

interface WidgetEditDialogProps {
  widget: Widget | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (widgetData: Partial<Widget>) => Promise<void>
}

const WidgetEditDialog: React.FC<WidgetEditDialogProps> = ({
  widget,
  open,
  onOpenChange,
  onSave
}) => {
  const { toast } = useToast()
  const [formData, setFormData] = useState({
    title: '',
    widget_type: 'metric' as Widget['widget_type'],
    position_x: 0,
    position_y: 0,
    width: 4,
    height: 1,
    config: {} as any,
    data_source: {} as any,
    filters: [] as any[],
    server_filters: {} as ServerFilterConfig
  })
  const [isLoading, setIsLoading] = useState(false)
  const [filterValidation, setFilterValidation] = useState<FilterValidationResult | null>(null)
  // Example fields for each table
  const tableFields: Record<string, string[]> = {
    servers: ['status', 'type', 'location', 'model', 'manufacturer'],
    racks: ['status', 'capacity', 'location', 'type'],
    rooms: ['status', 'floor', 'type', 'capacity'],
    data_centers: ['region', 'status', 'capacity', 'type'],
  }

  // Reset form when widget changes
  useEffect(() => {
    if (widget) {
      setFormData({
        title: widget.title || '',
        widget_type: widget.widget_type || 'metric',
        position_x: widget.position_x || 0,
        position_y: widget.position_y || 0,
        width: widget.width || 4,
        height: widget.height || 1,
        config: widget.config || {},
        data_source: widget.data_source || {},
        filters: widget.filters || [],
        server_filters: widget.server_filters || {}
      })
    }
  }, [widget])

  const handleSave = async () => {
    if (!widget) return

    setIsLoading(true)
    try {
      await onSave({
        id: widget.id,
        ...formData
      })
      
      toast({
        title: "Success",
        description: "Widget updated successfully"
      })
      
      onOpenChange(false)
    } catch (error) {
      console.error('Error updating widget:', error)
      toast({
        title: "Error",
        description: "Failed to update widget",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const updateConfig = (configKey: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      config: {
        ...prev.config,
        [configKey]: value
      }
    }))
  }

  const updateDataSource = (dsKey: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      data_source: {
        ...prev.data_source,
        [dsKey]: value
      }
    }))
  }

  const updateServerFilters = (serverFilters: ServerFilterConfig) => {
    setFormData(prev => ({
      ...prev,
      server_filters: serverFilters
    }))
  }

  const handleFilterValidation = (result: FilterValidationResult) => {
    setFilterValidation(result)
  }

  if (!widget) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Widget</DialogTitle>
          <DialogDescription>
            Customize your widget settings and configuration.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Basic Settings</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => updateFormData('title', e.target.value)}
                  placeholder="Widget title"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="widget_type">Widget Type</Label>
                <Select
                  value={formData.widget_type}
                  onValueChange={(value) => updateFormData('widget_type', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="metric">Metric</SelectItem>
                    <SelectItem value="chart">Chart</SelectItem>
                    <SelectItem value="table">Table</SelectItem>
                    <SelectItem value="timeline">Timeline</SelectItem>
                    <SelectItem value="stat">Stat</SelectItem>
                    <SelectItem value="gauge">Gauge</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Position and Size */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Position & Size</h3>
            
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="position_x">X Position</Label>
                <Input
                  id="position_x"
                  type="number"
                  min="0"
                  max="11"
                  value={formData.position_x}
                  onChange={(e) => updateFormData('position_x', parseInt(e.target.value))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="position_y">Y Position</Label>
                <Input
                  id="position_y"
                  type="number"
                  min="0"
                  value={formData.position_y}
                  onChange={(e) => updateFormData('position_y', parseInt(e.target.value))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="width">Width</Label>
                <Input
                  id="width"
                  type="number"
                  min="1"
                  max="12"
                  value={formData.width}
                  onChange={(e) => updateFormData('width', parseInt(e.target.value))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="height">Height</Label>
                <Input
                  id="height"
                  type="number"
                  min="1"
                  value={formData.height}
                  onChange={(e) => updateFormData('height', parseInt(e.target.value))}
                />
              </div>
            </div>
          </div>

          {/* Widget-specific Configuration */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Widget Configuration</h3>
            
            {formData.widget_type === 'chart' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="chart_type">Chart Type</Label>
                  <Select
                    value={formData.config.type || 'bar'}
                    onValueChange={(value) => updateConfig('type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bar">Bar Chart</SelectItem>
                      <SelectItem value="line">Line Chart</SelectItem>
                      <SelectItem value="pie">Pie Chart</SelectItem>
                      <SelectItem value="area">Area Chart</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center space-x-2 pt-6">
                  <input
                    type="checkbox"
                    id="show_legend"
                    checked={formData.config.showLegend || false}
                    onChange={(e) => updateConfig('showLegend', e.target.checked)}
                  />
                  <Label htmlFor="show_legend">Show Legend</Label>
                </div>
              </div>
            )}

            {formData.widget_type === 'metric' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="show_trend"
                    checked={formData.config.showTrend || false}
                    onChange={(e) => updateConfig('showTrend', e.target.checked)}
                  />
                  <Label htmlFor="show_trend">Show Trend</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="show_progress"
                    checked={formData.config.showProgress || false}
                    onChange={(e) => updateConfig('showProgress', e.target.checked)}
                  />
                  <Label htmlFor="show_progress">Show Progress</Label>
                </div>
              </div>
            )}

            {formData.widget_type === 'timeline' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="max_events">Max Events</Label>
                  <Input
                    id="max_events"
                    type="number"
                    min="1"
                    max="50"
                    value={formData.config.maxEvents || 10}
                    onChange={(e) => updateConfig('maxEvents', parseInt(e.target.value))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="group_by">Group By</Label>
                  <Select
                    value={formData.config.groupBy || 'day'}
                    onValueChange={(value) => updateConfig('groupBy', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hour">Hour</SelectItem>
                      <SelectItem value="day">Day</SelectItem>
                      <SelectItem value="week">Week</SelectItem>
                      <SelectItem value="month">Month</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          {/* Data Source */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Data Source</h3>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="data_table">Table</Label>
                <Select
                  value={formData.data_source.table || ''}
                  onValueChange={(value) => updateDataSource('table', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a table" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="servers">Servers</SelectItem>
                    <SelectItem value="racks">Racks</SelectItem>
                    <SelectItem value="rooms">Rooms</SelectItem>
                    <SelectItem value="data_centers">Data Centers</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Field dropdown, shown only if a table is selected */}
              {formData.data_source.table && (
                <div className="space-y-2">
                  <Label htmlFor="field">Field</Label>
                  <Select
                    value={formData.data_source.field || ''}
                    onValueChange={(value) => updateDataSource('field', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a field" />
                    </SelectTrigger>
                    <SelectContent>
                      {(tableFields[formData.data_source.table] || []).map((field) => (
                        <SelectItem key={field} value={field}>{field}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="aggregation">Aggregation</Label>
                <Select
                  value={formData.data_source.aggregation || 'count'}
                  onValueChange={(value) => updateDataSource('aggregation', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="count">Count</SelectItem>
                    <SelectItem value="sum">Sum</SelectItem>
                    <SelectItem value="avg">Average</SelectItem>
                    <SelectItem value="min">Minimum</SelectItem>
                    <SelectItem value="max">Maximum</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Server Filters - Only show for servers table */}
          {formData.data_source.table === 'servers' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Server Filters</h3>
              <ServerFilterComponent
                filters={formData.server_filters}
                onChange={updateServerFilters}
                onValidate={handleFilterValidation}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isLoading || (filterValidation && !filterValidation.isValid)}
          >
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default WidgetEditDialog
