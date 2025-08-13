
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';

interface PositionHistory {
  id: string;
  changed_at: string;
  previous_rack: string | null;
  previous_unit: string | null;
  previous_room: string | null;
  previous_floor: string | null;
  previous_building: string | null;
  previous_site: string | null;
}

interface Props {
  serverId: string;
}

const ServerPositionHistory = ({ serverId }: Props) => {
  const [history, setHistory] = useState<PositionHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('server_position_history')
        .select('id,changed_at,previous_rack,previous_unit,previous_room,previous_floor,previous_building,previous_site')
        .eq('server_id', serverId)
        .order('changed_at', { ascending: false });
      if (!error && data) setHistory(data as PositionHistory[]);
      setLoading(false);
    };
    fetchHistory();
  }, [serverId]);

  return (
    <Card className="mt-2">
      <CardHeader className="pb-2">
        <div className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Position History</div>
      </CardHeader>
      {loading ? (
        <div className="text-sm text-muted-foreground px-6 pb-2">Loading position history...</div>
      ) : !history.length ? (
        <div className="text-sm text-muted-foreground px-6 pb-3">No position history found.</div>
      ) : (
        <div className="space-y-2 px-6 pb-2">
          {history.map((h) => {
            const prev = [h.previous_site, h.previous_building, h.previous_floor, h.previous_room, h.previous_rack, h.previous_unit]
              .filter(Boolean)
              .join(' / ');
            const date = new Date(h.changed_at).toLocaleDateString();
            return (
              <div
                key={h.id}
                className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-blue-800 text-sm flex items-center gap-2"
              >
                <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-2" />
                <span>
                  Previous position: <b>{prev || '-'}</b> <span className="ml-2">Changed on <b>{date}</b></span>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};

export default ServerPositionHistory;
