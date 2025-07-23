import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ServerEnums, defaultServerEnums } from '@/types/enums';

/**
 * Custom hook to fetch and manage server enums from the backend
 * Uses direct fetch to the get-enums endpoint
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
        console.log('Fetching server enums from get-enums endpoint...');
        
        // Get the current session for authentication
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          throw new Error('Not authenticated');
        }
        
        // Fetch enums using the get-enums endpoint
        const response = await fetch('/functions/v1/get-enums', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data) {
          throw new Error('No data returned from get-enums');
        }
        
        console.log('Received server enums:', data);
        
        // Map the response to the ServerEnums type
        const mappedEnums: ServerEnums = {
          status: data.status || [],
          deviceTypes: data.deviceTypes || [],
          allocationTypes: data.allocationTypes || [],
          environmentTypes: data.environmentTypes || [],
          brands: data.brands || [],
          models: data.models || [],
          osTypes: data.osTypes || [],
          sites: data.sites || [],
          buildings: data.buildings || [],
          racks: data.racks || [],
          units: data.units || []
        };
        
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
