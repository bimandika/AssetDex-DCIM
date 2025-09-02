import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Widget } from '@/hooks/useDashboard';
import { Loader2, RefreshCw, Settings, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';

interface TableWidgetProps {
  widget: Widget;
  editMode?: boolean;
  onUpdate?: () => void;
  onRefresh?: () => void;
  onDelete?: () => void;
}

interface WidgetActionBarProps {
  onUpdate: () => void;
  onRefresh?: () => void;
  onDelete?: () => void;
}

const fetchWidgetData = async (config: any): Promise<any> => {
  try {
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;
    if (!token) throw new Error('No authentication token available');
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL || 'http://localhost:8000'}/functions/v1/widget-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ config }),
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const result = await response.json();
    return result.success ? result.data : null;
  } catch (err: any) {
    throw err;
  }
};

const WidgetActionBar: React.FC<WidgetActionBarProps> = ({ onUpdate, onRefresh, onDelete }) => (
  <>
    <Button variant="ghost" size="sm" onClick={onRefresh} className="h-8 w-8 p-0" title="Refresh">
      <RefreshCw className="h-4 w-4" />
    </Button>
    <Button variant="ghost" size="sm" onClick={onUpdate} className="h-8 w-8 p-0" title="Edit">
      <Settings className="h-4 w-4" />
    </Button>
    <Button variant="ghost" size="sm" onClick={onDelete} className="h-8 w-8 p-0 text-red-600 hover:text-red-700" title="Delete">
      <X className="h-4 w-4" />
    </Button>
  </>
);

const TableWidget: React.FC<TableWidgetProps> = ({ widget, editMode, onUpdate = () => {}, onDelete = () => {} }) => {
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = async () => {
    setIsRefreshing(true);
    setIsLoading(true);
    setError(null);
    try {
      const config = widget.data_source || {};
      const result = await fetchWidgetData(config);
      setData(result?.rows || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [widget.data_source]);

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{widget.title || 'Table Widget'}</CardTitle>
        <div className="flex items-center space-x-1">
          {editMode && (
            <WidgetActionBar onUpdate={onUpdate} onRefresh={loadData} onDelete={onDelete} />
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center text-red-500 py-4">{error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr>
                  {data[0] && Object.keys(data[0]).map((col) => (
                    <th key={col} className="px-2 py-1">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row, idx) => (
                  <tr key={idx}>
                    {Object.values(row).map((val, i) => (
                      <td key={i} className="px-2 py-1">{String(val)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {data.length === 0 && <div className="text-center py-4 text-muted-foreground">No data found</div>}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TableWidget;
