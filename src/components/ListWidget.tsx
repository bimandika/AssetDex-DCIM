// This file is being removed as part of the migration to the dashboard.
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
// import { Card, Select, Spinner, Alert } from 'shadcn/ui'; // Uncomment if using shadcn/ui
import './ListWidget.css'; // Optional: for custom styles

export interface ListWidgetProps {
  title: string;
  columns: string[];
  height?: number | string;
}

const SERVER_COLUMNS = [
  'hostname', 'ip_address', 'status', 'device_type', 'environment', 'brand', 'model', 'operating_system',
  'dc_site', 'dc_building', 'dc_floor', 'dc_room', 'allocation', 'rack', 'unit', 'notes'
];

export const ListWidget: React.FC<ListWidgetProps> = ({ title, columns, height = 400 }) => {
  const [selectedColumns, setSelectedColumns] = useState<string[]>(columns);
  const [filters, setFilters] = useState<Record<string, string>>({});

  const fetchData = async () => {
    const body: any = {
      columns: selectedColumns,
      limit: 100,
      offset: 0,
      ...filters,
    };
    const res = await fetch('/functions/v1/list-widget-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error('Failed to fetch data');
    return await res.json();
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ['list-widget', selectedColumns, filters],
    queryFn: fetchData,
  });

  // Column selector UI
  const handleColumnChange = (idx: number, value: string) => {
    const newCols = [...selectedColumns];
    newCols[idx] = value;
    setSelectedColumns(newCols);
  };

  // Filter UI (simple text inputs for demo)
  const handleFilterChange = (key: string, value: string) => {
    setFilters(f => ({ ...f, [key]: value }));
  };

  return (
    <div className="list-widget-card" style={{ height, overflowY: 'auto', border: '1px solid #eee', borderRadius: 8, padding: 16 }}>
      <div className="list-widget-header" style={{ marginBottom: 12 }}>
        <h3>{title}</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          {selectedColumns.map((col, idx) => (
            <select key={idx} value={col} onChange={e => handleColumnChange(idx, e.target.value)}>
              {SERVER_COLUMNS.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          {['dc_site', 'allocation', 'device_type', 'environment', 'status', 'brand', 'model', 'operating_system', 'dc_building', 'dc_floor', 'dc_room'].map(f => (
            <input
              key={f}
              placeholder={f}
              value={filters[f] || ''}
              onChange={e => handleFilterChange(f, e.target.value)}
              style={{ width: 100 }}
            />
          ))}
        </div>
      </div>
      <div className="list-widget-body" style={{ minHeight: 100 }}>
        {isLoading && <div>Loading...</div>}
        {error && <div style={{ color: 'red' }}>Error: {error.message}</div>}
        {!isLoading && !error && (!data || data.length === 0) && <div>No data found.</div>}
        {!isLoading && !error && data && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {selectedColumns.map(col => <th key={col} style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>{col}</th>)}
              </tr>
            </thead>
            <tbody>
              {data.map((row: any, idx: number) => (
                <tr key={idx}>
                  {selectedColumns.map(col => <td key={col} style={{ padding: '4px 8px', borderBottom: '1px solid #eee' }}>{row[col]}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export { SERVER_COLUMNS };

export default ListWidget;
