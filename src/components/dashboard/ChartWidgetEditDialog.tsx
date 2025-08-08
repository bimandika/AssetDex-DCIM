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
import type { Widget } from '@/hooks/useDashboard'

interface ChartWidgetEditDialogProps {
  widget: Widget | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (widgetData: Partial<Widget>) => Promise<void>
}

const chartFields = ['brand', 'model', 'status', 'type', 'location', 'brand']

const ChartWidgetEditDialog: React.FC<ChartWidgetEditDialogProps> = ({
  widget,
  open,
  onOpenChange,
  onSave
}) => {
  const { toast } = useToast()
  const [formData, setFormData] = useState({
    title: '',
    position_x: 0,
    position_y: 0,
    width: 4,
    height: 1,
    config: { type: 'bar', showLegend: true },
    data_source: { table: 'servers', aggregation: 'count', groupBy: ['brand'], filters: [] },
  })
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (widget) {
      setFormData({
        title: widget.title || '',
        position_x: widget.position_x || 0,
        position_y: widget.position_y || 0,
        width: widget.width || 4,
        height: widget.height || 1,
        config: widget.config || { type: 'bar', showLegend: true },
        data_source: {
          table: widget.data_source?.table || 'servers',
          aggregation: widget.data_source?.aggregation || 'count',
          groupBy: Array.isArray(widget.data_source?.groupBy)
            ? widget.data_source.groupBy
            : widget.data_source?.groupBy
              ? [widget.data_source.groupBy]
              : ['brand'],
          filters: widget.data_source?.filters || [],
        },
      })
    }
  }, [widget])

  const handleSave = async () => {
    if (!widget) return
    setIsLoading(true)
    try {
      // Only apply data_source, no filters for chart widget
      let groupByValue: string | string[] = formData.data_source.groupBy
      if (Array.isArray(groupByValue)) {
        groupByValue = groupByValue.length === 1 ? groupByValue[0] : groupByValue
      }
      const mergedFormData = {
        ...formData,
        data_source: {
          ...formData.data_source,
          groupBy: groupByValue,
        }
      }
      await onSave({
        id: widget.id,
        ...mergedFormData
      })
      toast({
        title: 'Success',
        description: 'Chart widget updated successfully'
      })
      onOpenChange(false)
    } catch (error) {
      console.error('Error updating chart widget:', error)
      toast({
        title: 'Error',
        description: 'Failed to update chart widget',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }
}
  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const updateConfig = (configKey: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      config: { ...prev.config, [configKey]: value }
    }))
  }

  const updateDataSource = (dsKey: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      data_source: { ...prev.data_source, [dsKey]: value }
    }))
  }

  // Add a breakdown field
  const addGroupByField = () => {
    setFormData((prev: any) => ({
      ...prev,
      data_source: {
        ...prev.data_source,
        groupBy: [...prev.data_source.groupBy, 'brand']
      }
    }))
  }

  // Remove a breakdown field by index
  const removeGroupByField = (idx: number) => {
    setFormData((prev: any) => ({
      ...prev,
      data_source: {
        ...prev.data_source,
        groupBy: prev.data_source.groupBy.filter((_: any, i: any) => i !== idx)
      }
    }))
  }

  if (!widget) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Chart Widget</DialogTitle>
          <DialogDescription>
            Configure your chart widget breakdown, type, and data source.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Chart Settings</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={e => updateFormData('title', e.target.value)}
                  placeholder="Widget title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="chart_type">Chart Type</Label>
                <Select
                  value={formData.config.type}
                  onValueChange={value => updateConfig('type', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bar">Bar Chart</SelectItem>
                    <SelectItem value="line">Line Chart</SelectItem>
                    <SelectItem value="pie">Pie Chart</SelectItem>
                    <SelectItem value="doughnut">Doughnut Chart</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center space-x-2 pt-2">
              <input
                type="checkbox"
                id="show_legend"
                checked={formData.config.showLegend}
                onChange={e => updateConfig('showLegend', e.target.checked)}
              />
              <Label htmlFor="show_legend">Show Legend</Label>
            </div>
          </div>
          {/* Breakdown Fields section always above Data Source */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Breakdown Fields</h3>
            <div className="space-y-2">
              <div style={{ color: 'red', fontWeight: 'bold' }}>DEBUG: groupBy = {JSON.stringify(formData.data_source.groupBy)}</div>
              <Label>Group By</Label>
              {(formData.data_source.groupBy.length === 0 ? ['brand'] : formData.data_source.groupBy).map((field: any, idx: any, arr: any[]) => (
                <div key={idx} className="flex items-center gap-2 mb-2">
                  <Select
                    value={field}
                    onValueChange={(value: any) => {
                      const newFields = [...arr]
                      newFields[idx] = value
                      updateDataSource('groupBy', newFields)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {chartFields.map((f: any) => (
                        <SelectItem key={f} value={f}>{f}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {arr.length > 1 && (
                    <Button type="button" size="sm" variant="ghost" onClick={() => removeGroupByField(idx)}>-</Button>
                  )}
                  {/* Always show the + button on the last field, even if only one field */}
                  {idx === arr.length - 1 && (
                    <Button type="button" size="sm" variant="ghost" onClick={addGroupByField}>Add Field +</Button>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Data Source</h3>
            <div className="space-y-2">
              <Label htmlFor="data_table">Table</Label>
              <Select
                value={formData.data_source.table}
                onValueChange={value => updateDataSource('table', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="servers">Servers</SelectItem>
                  <SelectItem value="racks">Racks</SelectItem>
                  <SelectItem value="rooms">Rooms</SelectItem>
                  <SelectItem value="data_centers">Data Centers</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="aggregation">Aggregation</Label>
              <Select
                value={formData.data_source.aggregation}
                onValueChange={value => updateDataSource('aggregation', value)}
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
            disabled={isLoading}
          >
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ChartWidgetEditDialog
