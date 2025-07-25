import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PropertyDefinition {
  id: string;
  key: string;
  name: string;
  display_name: string;
  property_type: 'text' | 'number' | 'boolean' | 'date' | 'select' | 'multiselect';
  description: string | null;
  category: string | null;
  required: boolean;
  default_value: string | null;
  options: any | null; // JSONB field for select options
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface PropertyDefinitionWithSchema extends PropertyDefinition {
  column_exists: boolean;
  column_type: string;
  is_nullable: string;
}

interface UsePropertyDefinitionsReturn {
  properties: PropertyDefinition[];
  propertiesWithSchema: PropertyDefinitionWithSchema[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const usePropertyDefinitions = (): UsePropertyDefinitionsReturn => {
  const [properties, setProperties] = useState<PropertyDefinition[]>([]);
  const [propertiesWithSchema, setPropertiesWithSchema] = useState<PropertyDefinitionWithSchema[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchProperties = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch basic property definitions
      const { data: basicProperties, error: basicError } = await supabase
        .from('property_definitions')
        .select('*')
        .eq('active', true)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });

      if (basicError) {
        throw basicError;
      }

      setProperties(basicProperties || []);

      // Try to fetch enhanced properties with schema info
      // This will use the new database function once it's available
      try {
        const { data: enhancedProperties, error: enhancedError } = await supabase
          .rpc('get_property_definitions_with_schema');

        if (enhancedError) {
          console.warn('Enhanced property fetch failed, using basic properties:', enhancedError);
          // Convert basic properties to enhanced format
          const basicAsEnhanced: PropertyDefinitionWithSchema[] = (basicProperties || []).map(prop => ({
            ...prop,
            column_exists: false, // We don't know without the function
            column_type: '',
            is_nullable: 'YES'
          }));
          setPropertiesWithSchema(basicAsEnhanced);
        } else {
          setPropertiesWithSchema(enhancedProperties || []);
        }
      } catch (rpcError) {
        console.warn('RPC function not available, using basic properties');
        const basicAsEnhanced: PropertyDefinitionWithSchema[] = (basicProperties || []).map(prop => ({
          ...prop,
          column_exists: false,
          column_type: '',
          is_nullable: 'YES'
        }));
        setPropertiesWithSchema(basicAsEnhanced);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch property definitions';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  return {
    properties,
    propertiesWithSchema,
    isLoading,
    error,
    refetch: fetchProperties,
  };
};