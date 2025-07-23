import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ServerEnums, defaultServerEnums } from '@/types/enums';
import { toast } from 'sonner';

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
        await fetchEnums(session.access_token);
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

  // Map of column names to their corresponding enum types in the database
  const columnToEnumType: Record<string, string> = {
    status: 'server_status',
    device_type: 'device_type',
    allocation: 'allocation_type',
    environment: 'environment_type',
    brand: 'brand_type',
    model: 'model_type',
    operating_system: 'os_type',
    dc_site: 'site_type',
    dc_building: 'building_type',
    rack: 'rack_type',
    unit: 'unit_type'
  };

  // Function to get the database enum type for a column
  const getEnumTypeForColumn = (columnName: string): string | null => {
    const key = Object.keys(columnToEnumType).find(key => 
      columnName.toLowerCase().includes(key)
    );
    return key ? columnToEnumType[key] : null;
  };

  // Function to add an enum value
  const addEnumValue = useCallback(async (columnName: string, value: string) => {
    try {
      const enumType = getEnumTypeForColumn(columnName);
      if (!enumType) {
        throw new Error(`No enum type mapping found for column: ${columnName}`);
      }

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        console.error('Session error:', sessionError);
        throw new Error('Not authenticated or session error');
      }

      console.log('Adding enum value:', { enumType, value });
      console.log('Using access token:', session.access_token ? 'Token exists' : 'No token');
      
      const requestBody = {
        type: enumType,
        value: value.trim(),
        action: 'add'
      };
      
      console.log('Request body:', requestBody);

      const apiUrl = import.meta.env.VITE_SUPABASE_URL ? 
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/enum-manager` : 
        'http://localhost:8000/functions/v1/enum-manager';
      
      console.log('Making request to:', apiUrl);
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || ''
        },
        body: JSON.stringify(requestBody)
      });

      console.log('Response status:', response.status);
      
      // First, get the response as text
      const responseText = await response.text();
      let responseData;
      
      try {
        // Try to parse as JSON if there's content and looks like JSON
        if (responseText && (responseText.trim().startsWith('{') || responseText.trim().startsWith('['))) {
          responseData = JSON.parse(responseText);
        } else if (response.ok) {
          // If the response is not JSON but the request was successful, create a success response
          console.log('Non-JSON response but request was successful. Response:', responseText);
          responseData = { success: true, message: 'Operation completed successfully' };
        } else {
          // If there was an error and we can't parse the response, throw with the raw text
          throw new Error(responseText || 'Unknown error occurred');
        }
        console.log('Response data:', responseData);
      } catch (e) {
        console.error('Error parsing response:', e);
        if (response.ok) {
          // If the request was successful but we had trouble parsing, still consider it a success
          console.log('Assuming success despite parse error');
          responseData = { success: true, message: 'Operation completed' };
        } else {
          throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }
      }
      
      // If we get here, consider it a success even if we couldn't parse the response
      if (!response.ok) {
        console.error('Error response:', {
          status: response.status,
          statusText: response.statusText,
          responseText
        });
        
        throw new Error(responseData?.message || `Failed to add enum value: ${response.statusText}`);
      }

      // If we got here, the request was successful
      // The response might be JSON or HTML, but we don't need to parse it
      console.log('Successfully added enum value:', { columnName, value });
      
      // Refresh enums after successful addition
      try {
        await fetchEnums(session.access_token);
        toast.success(`Added ${value} to ${columnName}`);
      } catch (fetchError) {
        console.error('Error refreshing enums:', fetchError);
        // Still return success since the value was added
        toast.success(`Added ${value} to ${columnName} (refresh to see changes)`);
      }
      
      return true;
    } catch (error) {
      console.error('Error in addEnumValue:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to add enum value: ${errorMessage}`);
      throw error;
    }
  }, []);

  // Function to fetch enums (extracted for reuse)
  const fetchEnums = async (accessToken: string) => {
    const response = await fetch('/functions/v1/get-enums', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data) {
      throw new Error('No data returned from get-enums');
    }
    
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
    return mappedEnums;
  };

  return { 
    enums, 
    loading, 
    error, 
    addEnumValue 
  };
};
