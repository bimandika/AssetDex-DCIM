import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Widget } from '@/hooks/useDashboard';
import { RefreshCw, Settings, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';

interface GaugeWidgetProps {
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

const WidgetActionBar: React.FC<WidgetActionBarProps> = ({ onUpdate, onRefresh, onDelete }) => (
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

const GaugeWidget: React.FC<GaugeWidgetProps> = ({ widget, editMode, onUpdate = () => {}, onDelete = () => {} }) => {
  const [value, setValue] = useState<number | null>(null);
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
      setValue(result?.value ?? null);
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
      <CardHeader className="relative">
        <CardTitle className="tracking-tight text-sm font-medium">{widget.title || 'Gauge Widget'}</CardTitle>
        {editMode && (
          <div className="absolute top-2 right-2 z-10">
            <WidgetActionBar onUpdate={onUpdate} onRefresh={loadData} onDelete={onDelete} />
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center h-full">
          <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center">
            {isLoading ? (
              <span className="text-xl text-muted-foreground">Loading...</span>
            ) : error ? (
              <span className="text-red-500 text-sm">{error}</span>
            ) : (
              <span className="text-3xl font-bold text-green-600">{value}%</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default GaugeWidget;
