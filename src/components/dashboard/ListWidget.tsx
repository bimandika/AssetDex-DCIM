import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings, RefreshCw, X } from 'lucide-react';
import type { Widget } from '@/hooks/useDashboard';

export const SERVER_COLUMNS = [
  'hostname', 'ip_address', 'status', 'device_type', 'environment', 'brand', 'model', 'operating_system',
  'dc_site', 'dc_building', 'dc_floor', 'dc_room', 'allocation', 'rack', 'unit', 'notes'
];

interface ListWidgetProps {
  widget: Widget;
  editMode?: boolean;
  onUpdate?: () => void;
  onDelete?: () => void;
}

const WidgetActionBar: React.FC<{ onUpdate: () => void; onDelete: () => void; onRefresh: () => void }> = ({ onUpdate, onDelete, onRefresh }) => (
  <div className="flex space-x-1 justify-end items-center mb-2">
    <Button variant="ghost" size="sm" onClick={onRefresh} className="h-8 w-8 p-0" title="Refresh">
      <RefreshCw size={18} />
    </Button>
    <Button variant="ghost" size="sm" onClick={onUpdate} className="h-8 w-8 p-0" title="Edit">
      <Settings size={18} />
    </Button>
    <Button variant="ghost" size="sm" onClick={onDelete} className="h-8 w-8 p-0 text-red-600 hover:text-red-700" title="Delete">
      <X size={18} />
    </Button>
  </div>
);

const fetchListWidgetData = async (widget: Widget, columns: string[], filters: Record<string, string>) => {
  // You may want to use widget.data_source/config for backend
  const body: any = {
    columns,
    limit: 100,
    offset: 0,
    ...filters,
    data_source: widget.data_source,
    config: widget.config,
  };
  const baseUrl = import.meta.env.VITE_SUPABASE_URL || 'http://localhost:8000';
  const res = await fetch(`${baseUrl}/functions/v1/list-widget-data`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Failed to fetch data');
  return await res.json();
};


const ListWidget: React.FC<ListWidgetProps> = ({ widget, editMode, onUpdate = () => {}, onDelete = () => {} }) => {
  const columns = widget.config?.columns || ['hostname', 'ip_address'];
  const filters = widget.filters || {};
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const savedPage = params.get(`${widget.id}_page`);
    return savedPage ? parseInt(savedPage) : 1;
  });
  const [itemsPerPage, setItemsPerPage] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const savedPerPage = params.get(`${widget.id}_perPage`);
    return savedPerPage ? parseInt(savedPerPage) : 10;
  });

  useEffect(() => {
    loadData();
    setCurrentPage(1); // Reset to first page on filter/config change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [widget.data_source, widget.config, JSON.stringify(filters)]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set(`${widget.id}_page`, currentPage.toString());
    params.set(`${widget.id}_perPage`, itemsPerPage.toString());
    const newSearch = params.toString();
    const newUrl = `${window.location.pathname}${newSearch ? '?' + newSearch : ''}${window.location.hash}`;
    window.history.replaceState({}, '', newUrl);
  }, [currentPage, itemsPerPage, widget.id]);

  const safeFilters: Record<string, string> =
    Array.isArray(filters) ? {} : (filters as Record<string, string>);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchListWidgetData(widget, columns, safeFilters);
      setData(result || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate pagination
  const totalPages = Math.ceil(data.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentData = data.slice(indexOfFirstItem, indexOfLastItem);

  // Determine widget height from config or prop
  const widgetHeight = widget.config?.height || widget.height || 400;
  const heightStyle = typeof widgetHeight === 'string' && widgetHeight.endsWith('%')
    ? { height: widgetHeight }
    : { height: `${widgetHeight}px` };

  // Column display names
  const COLUMN_LABELS: Record<string, string> = {
    hostname: 'Hostname',
    ip_address: 'IP Address',
    status: 'Status',
    device_type: 'Device Type',
    environment: 'Environment',
    brand: 'Brand',
    model: 'Model',
    operating_system: 'Operating System',
    dc_site: 'Site',
    dc_building: 'Building',
    dc_floor: 'Floor',
    dc_room: 'Room',
    allocation: 'Allocation',
    rack: 'Rack',
    unit: 'Unit',
    notes: 'Notes',
  };

  return (
    <Card className="shadow-md border rounded-xl">
      <CardHeader className="relative bg-gradient-to-r from-blue-50 to-white rounded-t-xl">
        <CardTitle className="tracking-tight text-base font-semibold text-blue-900">{widget.title || 'List Widget'}</CardTitle>
        {editMode && (
          <div className="absolute top-2 right-2 z-10">
            <WidgetActionBar onUpdate={onUpdate} onDelete={onDelete} onRefresh={loadData} />
          </div>
        )}
      </CardHeader>
      <CardContent className="p-4 flex flex-col">
        <div className="list-widget-body" style={{ ...heightStyle, minHeight: 100, overflowY: 'auto' }}>
          {isLoading && <div className="text-center py-8 text-blue-600">Loading...</div>}
          {error && <div className="text-center py-8 text-red-600">Error: {error}</div>}
          {!isLoading && !error && (!data || data.length === 0) && <div className="text-center py-8 text-gray-500">No data found.</div>}
          {!isLoading && !error && data && (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full border rounded-lg bg-white">
                  <thead className="sticky top-0 bg-blue-100 z-10">
                    <tr>
                      {columns.map((col: string) => (
                        <th key={col} className="px-4 py-2 text-left font-medium text-blue-900 border-b border-blue-200 uppercase text-xs tracking-wide">
                          {COLUMN_LABELS[col] || col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {currentData.map((row: any, idx: number) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-blue-50 hover:bg-blue-100' : 'bg-white hover:bg-blue-50'}>
                        {columns.map((col: string) => (
                          <td key={col} className="px-4 py-2 border-b border-blue-50 text-sm text-gray-700">
                            {row[col]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Pagination Controls */}
              <div className="flex flex-col sm:flex-row items-center justify-between mt-4 gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm">Rows per page:</span>
                  <select
                    className="border rounded px-2 py-1 text-sm focus:outline-none focus:ring focus:border-blue-300"
                    value={itemsPerPage}
                    onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                  >
                    {[10, 20, 50, 100].map(size => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(currentPage - 1)}
                  >
                    Prev
                  </Button>
                  <span className="text-sm">Page {currentPage} of {totalPages}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === totalPages || totalPages === 0}
                    onClick={() => setCurrentPage(currentPage + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ListWidget;
