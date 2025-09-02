import React, { useState, ChangeEvent } from 'react';
import { SERVER_COLUMNS } from './ListWidget';
import { useServerEnums } from '@/hooks/useServerEnums';

export interface ListWidgetEditDialogProps {
  initialTitle?: string;
  initialColumns?: string[];
  initialHeight?: number | string;
  onSave: (config: { title: string; columns: string[]; height: number | string }) => void;
  onCancel: () => void;
}

export const ListWidgetEditDialog: React.FC<ListWidgetEditDialogProps> = ({
  initialTitle = '',
  initialColumns = ['hostname', 'ip_address'],
  initialHeight = 400,
  onSave,
  onCancel,
}) => {
  const [title, setTitle] = useState<string>(initialTitle);
  const [columns, setColumns] = useState<string[]>(initialColumns);
  const [height, setHeight] = useState<number | string>(initialHeight);
  // Filter fields and enum mapping
  const FILTER_FIELDS = [
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
    onSave({ title, columns, height });
  };

  return (
      <div className="list-widget-edit-dialog" style={{ padding: 24, background: '#fff', borderRadius: 8, maxWidth: 400 }}>
        <h2>Edit List Widget</h2>
        <div style={{ marginBottom: 16 }}>
          <label>Title:</label>
          <input value={title} onChange={(e: ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)} style={{ width: '100%' }} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label>Columns (1-3):</label>
          {columns.map((col: string, idx: number) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <select value={col} onChange={(e: ChangeEvent<HTMLSelectElement>) => handleColumnChange(idx, e.target.value)}>
                {SERVER_COLUMNS.map((opt: string) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              {columns.length > 1 && <button type="button" onClick={() => handleRemoveColumn(idx)}>-</button>}
              {idx === columns.length - 1 && columns.length < 3 && <button type="button" onClick={handleAddColumn}>+</button>}
            </div>
          ))}
        </div>
        <div style={{ marginBottom: 16 }}>
          <label>Height (px or %):</label>
          <input value={height} onChange={(e: ChangeEvent<HTMLInputElement>) => setHeight(e.target.value)} style={{ width: '100%' }} />
        </div>
      <div style={{ marginBottom: 16 }}>
        <label>Filters:</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {FILTER_FIELDS.map(field => (
            <div key={field} style={{ marginBottom: 4 }}>
              <label style={{ fontSize: 12 }}>{field}</label>
              <select
                value={filters[field] || ''}
                onChange={e => handleFilterChange(field, e.target.value)}
                style={{ width: '100%' }}
                disabled={enumsLoading}
              >
                <option value="">{getDefaultFilterLabel(field)}</option>
                {(getEnumOptions(field) || []).map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
        <button type="button" onClick={onCancel}>Cancel</button>
        <button type="button" onClick={handleSave} style={{ background: '#007bff', color: '#fff' }}>Save</button>
      </div>
    </div>
  );
};

export default ListWidgetEditDialog;
