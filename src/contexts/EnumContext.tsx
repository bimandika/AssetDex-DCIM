import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { ServerEnums, defaultServerEnums } from '@/types/enums';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EnumContextType {
  enums: ServerEnums;
  loading: boolean;
  error: Error | null;
  refreshEnums: () => Promise<ServerEnums>;
  addEnumValue: (columnName: string, value: string) => Promise<boolean>;
  removeEnumValue: (columnName: string, value: string) => Promise<boolean>;
}

interface EnumContextProviderProps {
  children: ReactNode;
}

const EnumContext = createContext<EnumContextType | undefined>(undefined);

export const EnumContextProvider: React.FC<EnumContextProviderProps> = ({ children }) => {
  const [enums, setEnums] = useState<ServerEnums>(defaultServerEnums);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [propertyDefinitions, setPropertyDefinitions] = useState<any[]>([]);

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
    // First check static mapping for core columns
    const staticKey = Object.keys(columnToEnumType).find(key => 
      columnName.toLowerCase().includes(key)
    );
    if (staticKey) {
      return columnToEnumType[staticKey];
    }

    // Then check dynamic property definitions for custom enum columns
    const propertyDef = propertyDefinitions.find((prop: any) => 
      prop.key === columnName && prop.property_type === 'enum'
    );
    
    if (propertyDef) {
      // For dynamic enum columns, use the column name as the enum type
      // This assumes the backend creates enum types with the same name as the column
      return columnName;
    }

    return null;
  };

  // Function to fetch enums from the API
  const fetchEnums = useCallback(async (accessToken: string): Promise<ServerEnums> => {
    try {
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
      
      // Map the response to the ServerEnums type, including all dynamic enums
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
        floors: data.floors || [],
        rooms: data.rooms || [],
        racks: data.racks || [],
        units: data.units || [],
        // Include all other dynamic enum types from the response
        ...Object.keys(data).reduce((acc, key) => {
          // Only include keys that aren't already mapped above
          if (!['status', 'deviceTypes', 'allocationTypes', 'environmentTypes', 
                'brands', 'models', 'osTypes', 'sites', 'buildings', 'floors', 'rooms', 'racks', 'units'].includes(key)) {
            acc[key] = data[key] || [];
          }
          return acc;
        }, {} as Record<string, string[]>)
      };
      
      return mappedEnums;
    } catch (error) {
      console.error('Error in fetchEnums:', error);
      throw error;
    }
  }, []);

  // Global refresh function that updates all subscribers
  const refreshEnums = useCallback(async (): Promise<ServerEnums | void> => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Not authenticated');
      }
      
      const enumsData = await fetchEnums(session.access_token);
      setEnums(enumsData);
      setError(null);
      
      // Emit custom event for cross-component synchronization
      window.dispatchEvent(new CustomEvent('enumsUpdated', { detail: enumsData }));
      
      return enumsData;
    } catch (err) {
      console.error('Error refreshing enums:', err);
      const error = err instanceof Error ? err : new Error('Failed to refresh enums');
      setError(error);
      setEnums(defaultServerEnums);
    } finally {
      setLoading(false);
    }
  }, [fetchEnums]);

  // Function to add an enum value with global synchronization
  const addEnumValue = useCallback(async (columnName: string, value: string): Promise<boolean> => {
    try {
      let enumType = getEnumTypeForColumn(columnName);
      
      // If no enum type found, refresh property definitions and try again
      if (!enumType) {
        console.log('EnumContext: No enum type found for column, refreshing property definitions:', columnName);
        await fetchPropertyDefinitions();
        enumType = getEnumTypeForColumn(columnName);
      }
      
      // If still no enum type found, assume the column name is the enum type (for new dynamic columns)
      if (!enumType) {
        console.log('EnumContext: Still no enum type found, using column name as enum type:', columnName);
        enumType = columnName;
      }

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        console.error('Session error:', sessionError);
        throw new Error('Not authenticated or session error');
      }

      console.log('Adding enum value:', { enumType, value });
      
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
      
      // Handle response
      const responseText = await response.text();
      let responseData;
      
      try {
        if (responseText && (responseText.trim().startsWith('{') || responseText.trim().startsWith('['))) {
          responseData = JSON.parse(responseText);
        } else if (response.ok) {
          console.log('Non-JSON response but request was successful. Response:', responseText);
          responseData = { success: true, message: 'Operation completed successfully' };
        } else {
          throw new Error(responseText || 'Unknown error occurred');
        }
        console.log('Response data:', responseData);
      } catch (e) {
        console.error('Error parsing response:', e);
        if (response.ok) {
          console.log('Assuming success despite parse error');
          responseData = { success: true, message: 'Operation completed' };
        } else {
          throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }
      }
      
      if (!response.ok) {
        console.error('Error response:', {
          status: response.status,
          statusText: response.statusText,
          responseText
        });
        
        throw new Error(responseData?.message || `Failed to add enum value: ${response.statusText}`);
      }

      console.log('Successfully added enum value:', { columnName, value });
      
      // Refresh enums globally after successful addition
      try {
        await refreshEnums();
        toast.success(`Added ${value} to ${columnName}`);
      } catch (fetchError) {
        console.error('Error refreshing enums:', fetchError);
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
  }, [getEnumTypeForColumn, refreshEnums]);

  // Function to remove an enum value with global synchronization
  const removeEnumValue = useCallback(async (columnName: string, value: string): Promise<boolean> => {
    try {
      let enumType = getEnumTypeForColumn(columnName);
      
      // If no enum type found, refresh property definitions and try again
      if (!enumType) {
        console.log('EnumContext: No enum type found for column, refreshing property definitions:', columnName);
        await fetchPropertyDefinitions();
        enumType = getEnumTypeForColumn(columnName);
      }
      
      // If still no enum type found, assume the column name is the enum type (for new dynamic columns)
      if (!enumType) {
        console.log('EnumContext: Still no enum type found, using column name as enum type:', columnName);
        enumType = columnName;
      }

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        console.error('Session error:', sessionError);
        throw new Error('Not authenticated or session error');
      }

      console.log('Removing enum value:', { enumType, value });
      
      const requestBody = {
        type: enumType,
        value: value.trim(),
        action: 'remove'
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
      
      // Handle response
      const responseText = await response.text();
      let responseData;
      
      try {
        if (responseText && (responseText.trim().startsWith('{') || responseText.trim().startsWith('['))) {
          responseData = JSON.parse(responseText);
        } else if (response.ok) {
          console.log('Non-JSON response but request was successful. Response:', responseText);
          responseData = { success: true, message: 'Operation completed successfully' };
        } else {
          throw new Error(responseText || 'Unknown error occurred');
        }
        console.log('Response data:', responseData);
      } catch (e) {
        console.error('Error parsing response:', e);
        if (response.ok) {
          console.log('Assuming success despite parse error');
          responseData = { success: true, message: 'Operation completed' };
        } else {
          throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }
      }
      
      if (!response.ok) {
        console.error('Error response:', {
          status: response.status,
          statusText: response.statusText,
          responseText
        });
        
        throw new Error(responseData?.message || `Failed to remove enum value: ${response.statusText}`);
      }

      console.log('Successfully removed enum value:', { columnName, value });
      
      // Refresh enums globally after successful removal
      try {
        await refreshEnums();
        toast.success(`Removed ${value} from ${columnName}`);
      } catch (fetchError) {
        console.error('Error refreshing enums:', fetchError);
        toast.success(`Removed ${value} from ${columnName} (refresh to see changes)`);
      }
      
      return true;
    } catch (error) {
      console.error('Error in removeEnumValue:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to remove enum value: ${errorMessage}`);
      throw error;
    }
  }, [getEnumTypeForColumn, refreshEnums]);

  // Fetch property definitions for dynamic enum type mapping
  const fetchPropertyDefinitions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('property_definitions')
        .select('key, property_type')
        .eq('property_type', 'enum')
        .eq('active', true);
      
      if (error) {
        console.error('Error fetching property definitions:', error);
        return;
      }
      
      setPropertyDefinitions(data || []);
    } catch (err) {
      console.error('Error fetching property definitions:', err);
    }
  }, []);

  // Function to initialize property definitions and enums
  const initializeEnums = async () => {
    try {
      // Fetch property definitions first for dynamic enum mapping
      await fetchPropertyDefinitions();
      
      // Then fetch enums
      await refreshEnums();
    } catch (err) {
      console.error('Error initializing enums:', err);
    }
  };

  // Initial fetch on mount
  useEffect(() => {
    const fetchInitialEnums = async () => {
      try {
        setLoading(true);
        console.log('Fetching initial server enums from get-enums endpoint...');
        
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          throw new Error('Not authenticated');
        }
        
        const enumsData = await fetchEnums(session.access_token);
        setEnums(enumsData);
        setError(null);
      } catch (err) {
        console.error('Error fetching initial server enums:', err);
        const error = err instanceof Error ? err : new Error('Failed to fetch server enums');
        setError(error);
        setEnums(defaultServerEnums);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialEnums();
    initializeEnums();
  }, [fetchEnums, fetchPropertyDefinitions]);

  // Effect to refresh property definitions when enums are updated
  useEffect(() => {
    const handleEnumsUpdated = () => {
      fetchPropertyDefinitions();
    };

    const handleSchemaUpdated = (event: CustomEvent) => {
      console.log('EnumContext: Schema updated, refreshing property definitions', event.detail);
      // Refresh property definitions when new enum columns are added
      fetchPropertyDefinitions();
    };

    window.addEventListener('enumsUpdated', handleEnumsUpdated);
    window.addEventListener('schemaUpdated', handleSchemaUpdated as EventListener);
    
    return () => {
      window.removeEventListener('enumsUpdated', handleEnumsUpdated);
      window.removeEventListener('schemaUpdated', handleSchemaUpdated as EventListener);
    };
  }, [fetchPropertyDefinitions]);

  const contextValue: EnumContextType = {
    enums,
    loading,
    error,
    refreshEnums,
    addEnumValue,
    removeEnumValue
  };

  return (
    <EnumContext.Provider value={contextValue}>
      {children}
    </EnumContext.Provider>
  );
};

export const useEnumContext = (): EnumContextType => {
  const context = useContext(EnumContext);
  if (context === undefined) {
    throw new Error('useEnumContext must be used within an EnumContextProvider');
  }
  return context;
};