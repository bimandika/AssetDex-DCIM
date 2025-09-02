import React, { useState, useEffect, ChangeEvent } from 'react'
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
import FilterDropdown from './FilterDropdown';
import { useEnumContext } from '@/contexts/EnumContext';
import { useLocation, useNavigate } from 'react-router-dom';

interface ChartWidgetEditDialogProps {
  widget: Widget | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (widgetData: Partial<Widget>) => Promise<void>
}

const ChartWidgetEditDialog: React.FC<ChartWidgetEditDialogProps> = ({
  widget,
  open,
  onOpenChange,
  onSave
}) => {
  const { toast } = useToast()
  const { enums } = useEnumContext();
  const location = useLocation();
  const navigate = useNavigate();

  // Helper to get default label for each filter
  const getDefaultFilterLabel = (field: string): string => {
    const labels: Record<string, string> = {
      device_type: 'All Device Types',
      environment: 'All Environments',
      brand: 'All Brands',
      model: 'All Models',
      allocation: 'All Allocations',
      operating_system: 'All OS',
      dc_site: 'All Sites',
      dc_building: 'All Buildings',
      rack: 'All Racks',
      status: 'All Status',
    };
    return labels[field] || 'All';
  };

  // Helper to get enum options for a field
  const getEnumOptions = (field: string): string[] | undefined => {
    const mapping: Record<string, string> = {
      status: 'status',
      device_type: 'deviceTypes',
      allocation: 'allocationTypes',
      environment: 'environmentTypes',
      brand: 'brands',
      model: 'models',
      operating_system: 'osTypes',
      dc_site: 'sites',
      dc_building: 'buildings',
      rack: 'racks',
    };
    const enumKey = mapping[field];
    if (enumKey && enums[enumKey]) {
      return enums[enumKey];
    }
    return undefined;
  };

  const [formData, setFormData] = useState<{
    title: string;
    position_x: number;
    position_y: number;
    width: number;
    height: number;
    config: { type: string; showLegend: boolean };
    data_source: {
      table: string;
      aggregation: string;
      groupBy: string[];
      filters: Record<string, string>;
    };
  }>({
    title: '',
    position_x: 0,
    position_y: 0,
    width: 4,
    height: 1,
    config: { type: 'bar', showLegend: true },
    data_source: { table: 'servers', aggregation: 'count', groupBy: ['model'], filters: {} },
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
          filters: (widget.data_source?.filters && typeof widget.data_source.filters === 'object')
            ? widget.data_source.filters
            : {},
        },
      })
    }
  }, [widget])

  const handleSave = async () => {
    if (!widget) return;
    setIsLoading(true);
    try {
      // Validate and default required fields
      const safeWidget = {
        id: widget.id,
        title: formData.title || 'Untitled Widget',
        position_x: typeof formData.position_x === 'number' ? formData.position_x : 0,
        position_y: typeof formData.position_y === 'number' ? formData.position_y : 0,
        width: typeof formData.width === 'number' ? formData.width : 4,
        height: typeof formData.height === 'number' ? formData.height : 1,
        config: {
          type: formData.config?.type || 'bar',
          showLegend: typeof formData.config?.showLegend === 'boolean' ? formData.config.showLegend : true,
        },
        data_source: {
          table: formData.data_source?.table || 'servers',
          aggregation: formData.data_source?.aggregation || 'count',
          groupBy: Array.isArray(formData.data_source?.groupBy)
            ? formData.data_source.groupBy
            : (formData.data_source?.groupBy ? [formData.data_source.groupBy] : ['brand']),
          filters: (formData.data_source?.filters && typeof formData.data_source.filters === 'object')
            ? formData.data_source.filters
            : {},
        },
      };
      // Remove any undefined fields recursively
      const cleanObject = (obj: any): unknown => {
        if (Array.isArray(obj)) return obj.filter(v => v !== undefined);
        if (obj && typeof obj === 'object') {
          return Object.fromEntries(
            Object.entries(obj)
              .filter(([_, v]) => v !== undefined)
              .map(([k, v]) => [k, cleanObject(v)])
          );
        }
        return obj;
      };
      const finalWidget = cleanObject(safeWidget);
      await onSave(finalWidget as Partial<Widget>);
      toast({
        title: 'Success',
        description: 'Chart widget updated successfully',
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating chart widget:', error);
      toast({
        title: 'Error',
        description: 'Failed to update chart widget',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  const updateFormData = (field: string, value: any) => {
    setFormData((prev: typeof formData) => ({ ...prev, [field]: value }))
  }

  const updateConfig = (configKey: string, value: any) => {
    setFormData((prev: typeof formData) => ({
      ...prev,
      config: { ...prev.config, [configKey]: value }
    }))
  }

  const updateDataSource = (dsKey: string, value: any) => {
    setFormData((prev: typeof formData) => ({
      ...prev,
      data_source: { ...prev.data_source, [dsKey]: value }
    }))
  }



  // Helper to parse query params for dialog state
  const parseDialogParams = (search: string) => {
    const params = new URLSearchParams(search);
    return {
      groupBy: params.get('cw_groupBy') ? params.get('cw_groupBy')!.split(',') : undefined,
      table: params.get('cw_table') || undefined,
      aggregation: params.get('cw_agg') || undefined,
      filters: (() => {
        const obj: Record<string, string> = {};
        for (const [key, value] of params.entries()) {
          if (key.startsWith('cw_filter_')) obj[key.replace('cw_filter_', '')] = value;
        }
        return obj;
      })(),
    };
  };

  // On open, restore dialog state from URL
  useEffect(() => {
    if (open) {
      const { groupBy, table, aggregation, filters } = parseDialogParams(location.search);
      setFormData(prev => ({
        ...prev,
        data_source: {
          ...prev.data_source,
          groupBy: groupBy || prev.data_source.groupBy,
          table: table || prev.data_source.table,
          aggregation: aggregation || prev.data_source.aggregation,
          filters: Object.keys(filters).length > 0 ? filters : prev.data_source.filters,
        },
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Update URL when dialog state changes and dialog is open
  useEffect(() => {
    if (!open) return;
    const params = new URLSearchParams(location.search);
    params.set('cw_groupBy', formData.data_source.groupBy.join(','));
    params.set('cw_table', String(formData.data_source.table));
    params.set('cw_agg', String(formData.data_source.aggregation));
    Object.entries(formData.data_source.filters || {}).forEach(([key, value]) => {
      params.set(`cw_filter_${key}`, String(value));
    });
    navigate({ search: params.toString() }, { replace: true });
  }, [formData.data_source, open, location.search, navigate]);

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
                  onChange={(e: ChangeEvent<HTMLInputElement>) => updateFormData('title', e.target.value)}
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
                onChange={(e: ChangeEvent<HTMLInputElement>) => updateConfig('showLegend', e.target.checked)}
              />
              <Label htmlFor="show_legend">Show Legend</Label>
            </div>
          </div>
          {/* Breakdown Fields section always above Data Source */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Breakdown Fields</h3>
            <div className="space-y-2">
              <Label>Group By</Label>
              <Select
                value={formData.data_source.groupBy.join(',')}
                onValueChange={value => updateDataSource('groupBy', value.split(','))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['device_type', 'environment', 'brand', 'model', 'allocation', 'operating_system', 'dc_site', 'dc_building', 'rack', 'status'].map(field => (
                    <SelectItem key={field} value={field}>{field}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Filters</Label>
              {['device_type', 'environment', 'brand', 'model', 'allocation', 'operating_system', 'dc_site', 'dc_building', 'rack', 'status'].map(field => (
                <FilterDropdown
                  key={field}
                  field={field}
                  value={String(formData.data_source.filters?.[field] || getDefaultFilterLabel(field))}
                  onChange={value => {
                    const newFilters = { ...formData.data_source.filters, [field]: String(value) };
                    updateDataSource('filters', newFilters);
                  }}
                  options={[getDefaultFilterLabel(field), ...(getEnumOptions(field) || [])]}
                />
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
