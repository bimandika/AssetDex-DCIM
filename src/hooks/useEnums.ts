import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ServerEnums, defaultServerEnums } from '@/types/enums';
import { toast } from 'sonner';

export const useEnums = () => {
  const [enums, setEnums] = useState<ServerEnums>(defaultServerEnums);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  // Function to fetch enums (extracted for reuse)
  const fetchEnums = useCallback(async (accessToken: string) => {
    try {
      // Use the same URL construction as in useServerEnums
      const apiUrl = import.meta.env.VITE_SUPABASE_URL ? 
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-enums` : 
        'http://localhost:8000/functions/v1/get-enums';
      
      console.log('Fetching enums from:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || ''
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', {
          status: response.status,
          statusText: response.statusText,
          errorText
        });
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data) {
        throw new Error('No data returned from get-enums');
      }
      
      console.log('Fetched enums:', data);
      
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
      
      return mappedEnums;
    } catch (error) {
      console.error('Error in fetchEnums:', error);
      throw error;
    }
  }, []);

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
        const enumsData = await fetchEnums(session.access_token);
        setEnums(enumsData);
        setError(null);
      } catch (err) {
        console.error('Error fetching server enums:', err);
        const error = err instanceof Error ? err : new Error('Failed to fetch server enums');
        setError(error);
        // Fall back to default enums
        setEnums(defaultServerEnums);
        toast.error(`Failed to fetch enums: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchServerEnums();
  }, [fetchEnums]);

  // Function to refresh enums
  const refreshEnums = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const enumsData = await fetchEnums(session.access_token);
      setEnums(enumsData);
      return enumsData;
    } catch (error) {
      console.error('Error refreshing enums:', error);
      throw error;
    }
  }, [fetchEnums]);

  return { 
    enums, 
    loading, 
    error, 
    refreshEnums 
  };
};
