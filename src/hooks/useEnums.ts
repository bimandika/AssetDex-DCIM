import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ServerEnums, defaultServerEnums } from '@/types/enums';

export const useEnums = () => {
  const [enums, setEnums] = useState<ServerEnums>(defaultServerEnums);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchEnums = async () => {
      try {
        setLoading(true);
        
        // Try to fetch enums from the edge function first
        const { data, error: enumError } = await supabase.functions.invoke('get-enums');
        
        if (enumError) throw enumError;
        
        if (data) {
          setEnums({
            status: data.status || defaultServerEnums.status,
            deviceTypes: data.deviceTypes || defaultServerEnums.deviceTypes,
            allocationTypes: data.allocationTypes || defaultServerEnums.allocationTypes,
            environmentTypes: data.environmentTypes || defaultServerEnums.environmentTypes,
            brands: data.brands || defaultServerEnums.brands,
            models: data.models || defaultServerEnums.models,
            osTypes: data.osTypes || defaultServerEnums.osTypes,
            sites: data.sites || defaultServerEnums.sites,
            buildings: data.buildings || defaultServerEnums.buildings,
            racks: data.racks || defaultServerEnums.racks,
            units: data.units || defaultServerEnums.units,
          });
        }
      } catch (err) {
        console.error('Error fetching enums:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch enums'));
        // Fall back to default enums
        setEnums(defaultServerEnums);
      } finally {
        setLoading(false);
      }
    };

    fetchEnums();
  }, []);

  return { enums, loading, error };
};
