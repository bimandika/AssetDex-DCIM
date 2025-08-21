import React, { useState, ChangeEvent } from 'react';
import { SERVER_COLUMNS } from './ListWidget';
import { useServerEnums } from '@/hooks/useServerEnums';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
export interface ListWidgetEditDialogProps {
  initialTitle?: string;
  initialColumns?: string[];
  initialHeight?: number | string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (config: { title: string; columns: string[]; height: number | string; filters: Record<string, string> }) => void;
  onCancel: () => void;
}

const ListWidgetEditDialog: React.FC<ListWidgetEditDialogProps> = ({
  initialTitle = '',
  initialColumns = ['hostname', 'ip_address'],
  initialHeight = 400,
  open,
  onOpenChange,
  onSave,
  onCancel,
}: ListWidgetEditDialogProps) => {
  const [title, setTitle] = useState<string>(initialTitle);
  const [columns, setColumns] = useState<string[]>(initialColumns);
  const [height, setHeight] = useState<number | string>(initialHeight);
  const FILTER_FIELDS: string[] = [
    'status', 'device_type', 'allocation', 'environment', 'brand', 'model', 'operating_system', 'dc_site', 'dc_building', 'dc_floor', 'dc_room', 'rack', 'unit'
  ];
  const { enums, loading: enumsLoading } = useServerEnums();
  const [filters, setFilters] = useState<Record<string, string>>({});

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
      dc_floor: 'All Floors',
      dc_room: 'All Rooms',
      rack: 'All Racks',
      unit: 'All Units',
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
      dc_floor: 'floors',
      dc_room: 'rooms',
      rack: 'racks',
      unit: 'units',
    };
    const enumKey = mapping[field];
    if (enumKey && enums[enumKey]) {
      return enums[enumKey];
    }
    return undefined;
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters((f: Record<string, string>) => ({ ...f, [key]: value }));
  };

  const handleColumnChange = (idx: number, value: string) => {
    const newCols = [...columns];
    newCols[idx] = value;
    setColumns(newCols);
  };

  const handleAddColumn = () => {
    if (columns.length < 3) {
      setColumns([...columns, SERVER_COLUMNS[0]]);
    }
  };

  const handleRemoveColumn = (idx: number) => {
    if (columns.length > 1) {
      setColumns(columns.filter((_: string, i: number) => i !== idx));
    }
  };

  const handleSave = () => {
    onSave({
      title,
      config: { columns },
      height,
      filters
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit List Widget</DialogTitle>
          <DialogDescription>
            Configure your list widget columns, height, and filters.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
                placeholder="Widget title"
              />
            </div>
            <div className="space-y-2">
              <Label>Height (px or %)</Label>
              <Input
                value={height}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setHeight(e.target.value)}
                placeholder="400"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Columns (1-3)</Label>
            <div className="flex flex-col gap-2">
              {columns.map((col: string, idx: number) => (
                <div key={idx} className="flex items-center gap-2">
                  <Select value={col} onValueChange={(value: string) => handleColumnChange(idx, value)}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SERVER_COLUMNS.map((opt: string) => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {columns.length > 1 && (
                    <Button variant="outline" size="sm" onClick={() => handleRemoveColumn(idx)}>-</Button>
                  )}
                  {idx === columns.length - 1 && columns.length < 3 && (
                    <Button variant="outline" size="sm" onClick={handleAddColumn}>+</Button>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Filters</Label>
            <div className="grid grid-cols-2 gap-4">
              {FILTER_FIELDS.map(field => (
                <div key={field} className="space-y-1">
                  <Label className="text-xs">{field}</Label>
                  <Select
                    value={filters[field] ?? "__all__"}
                    onValueChange={(value: string) => handleFilterChange(field, value === "__all__" ? "" : value)}
                    disabled={enumsLoading}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">{getDefaultFilterLabel(field)}</SelectItem>
                      {(getEnumOptions(field) || []).map(opt => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={handleSave} className="bg-blue-600 text-white">Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ListWidgetEditDialog;
