import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ServerEnums, defaultServerEnums } from '@/types/enums';

/**
 * Custom hook to fetch and manage server enums from the backend
 * Uses direct fetch to the backend endpoint with authentication
 * @returns Object containing enums, loading state, and error if any
 */
export const useServerEnums = () => {
  const [enums, setEnums] = useState<ServerEnums>(defaultServerEnums);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchServerEnums = async () => {
      try {
        setLoading(true);
        console.log('Fetching server enums from backend...');
        
        // Get the current session for authentication
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          throw new Error('Not authenticated');
        }
        
        // Fetch enums using Supabase Functions
        const { data, error: fetchError } = await supabase.functions.invoke('enum-manager', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: { action: 'get-enums' },
        });

        if (fetchError) {
          throw fetchError;
        }

        if (!data || !data.enums) {
          throw new Error('No enums data returned from enum-manager');
        }
        
        console.log('Received server enums:', data);
        
        // Initialize with default values
        const mappedEnums: ServerEnums = { ...defaultServerEnums };
        
        // Process the enums array from the response
        if (Array.isArray(data.enums)) {
          data.enums.forEach((enumItem: { name: string; values: unknown[] }) => {
            const enumName = enumItem.name.replace('_type', '');
            
            // Define the mapping of enum names to ServerEnums keys and their types
            const enumMappings: Record<string, { key: keyof ServerEnums; type: 'string' | 'custom' }> = {
              'server_status': { key: 'status', type: 'custom' },
              'device_type': { key: 'deviceTypes', type: 'custom' },
              'allocation_type': { key: 'allocationTypes', type: 'custom' },
              'environment_type': { key: 'environmentTypes', type: 'custom' },
              'brand_type': { key: 'brands', type: 'string' },
              'model_type': { key: 'models', type: 'string' },
              'os_type': { key: 'osTypes', type: 'string' },
              'site_type': { key: 'sites', type: 'string' },
              'building_type': { key: 'buildings', type: 'string' },
              'rack_type': { key: 'racks', type: 'string' },
              'unit_type': { key: 'units', type: 'string' }
            };
            
            const mapping = enumMappings[enumName];
            if (mapping && enumItem.values && Array.isArray(enumItem.values)) {
              // For custom types, we assume the values are already in the correct format
              // For string types, we ensure they're strings
              const values = mapping.type === 'string' 
                ? enumItem.values.map(v => String(v))
                : enumItem.values;
                
              mappedEnums[mapping.key] = values as any;
            }
          });
        }
        
        setEnums(mappedEnums);
        setError(null);
      } catch (err) {
        console.error('Error fetching server enums:', err);
        const error = err instanceof Error ? err : new Error('Failed to fetch server enums');
        setError(error);
        // Fall back to default enums
        setEnums(defaultServerEnums);
      } finally {
        setLoading(false);
      }
    };

    fetchServerEnums();
  }, []);

  return { enums, loading, error };
};
