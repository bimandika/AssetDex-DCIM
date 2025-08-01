import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { useEnumContext } from '@/contexts/EnumContext';

// Define the TableColumn interface
export interface TableColumn {
  column_name: string;
  data_type: 'text' | 'number' | 'boolean' | 'date' | 'select';
  is_nullable: 'YES' | 'NO';
  column_default: string | null;
  is_enum: boolean;
  enum_values: string[];
}

// Helper function to map database types to property types
const mapDbTypeToPropertyType = (dbType: string): 'text' | 'number' | 'boolean' | 'date' | 'select' => {
  if (!dbType) return 'text';
  
  const type = dbType.toLowerCase();
  
  if (type.includes('int') || type.includes('numeric') || type.includes('decimal') || type.includes('float') || type.includes('double')) {
    return 'number';
  }
  
  if (type === 'boolean' || type === 'bool') {
    return 'boolean';
  }
  
  if (type.includes('date') || type.includes('time')) {
    return 'date';
  }
  
  return 'text';
};

export const useTableSchema = (tableName: string = 'servers') => {
  const [columns, setColumns] = useState<TableColumn[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();
  const { enums } = useEnumContext();

  // Function to get current rack values dynamically
  const getRackEnumValues = (): string[] => {
    // Try to get racks from enums first
    if (enums?.racks && Array.isArray(enums.racks) && enums.racks.length > 0) {
      return enums.racks;
    }
    
    // Fallback to a reasonable default set if enums not loaded yet
    return ["RACK-01","RACK-02","RACK-03","RACK-04","RACK-05","RACK-06","RACK-07","RACK-08","RACK-09","RACK-10"];
  };

  const fetchTableSchema = useCallback(async () => {
    try {
      setLoading(true);
      
      // Call the get-table-schema Edge Function with query parameters
      const { data, error: schemaError } = await supabase.functions.invoke(
        `get-table-schema?table=${encodeURIComponent(tableName)}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (schemaError) throw schemaError;
      
      if (data?.data) {
        // Transform the data to match our TableColumn interface
        const transformedColumns = data.data.map((col: any) => ({
          column_name: col.column_name,
          data_type: mapDbTypeToPropertyType(col.data_type),
          is_nullable: col.is_nullable,
          column_default: col.column_default,
          is_enum: col.is_enum || false,
          enum_values: Array.isArray(col.enum_values) ? col.enum_values : []
        }));
        
        setColumns(transformedColumns);
      } else {
        throw new Error('No data returned from server');
      }
    } catch (err) {
      console.error('Error fetching table schema:', err);
      const error = err instanceof Error ? err : new Error('Failed to fetch table schema');
      setError(error);
      
      // Fallback to default columns if the function fails
      toast({
        title: "Error loading schema",
        description: "Using default schema. Some features may be limited.",
        variant: "destructive",
      });
      
      // Fallback to default columns
      const fallbackColumns: TableColumn[] = [
        { 
          column_name: 'brand', 
          data_type: 'text', 
          is_nullable: 'YES',
          column_default: null,
          is_enum: true,
          enum_values: ["Dell","HPE","Cisco","Juniper","NetApp","Huawei","Inspur","Kaytus","ZTE","Meta Brain"]
        },
        { 
          column_name: 'model', 
          data_type: 'text', 
          is_nullable: 'YES',
          column_default: null,
          is_enum: true,
          enum_values: ["PowerEdge R740","PowerEdge R750","PowerEdge R750xd","PowerVault ME4","ProLiant DL380","ProLiant DL360","Apollo 4510","ASA 5525-X","Nexus 93180YC-EX","MX204","AFF A400","Other"]
        },
        { 
          column_name: 'operating_system', 
          data_type: 'text', 
          is_nullable: 'YES',
          column_default: null,
          is_enum: true,
          enum_values: ["Ubuntu 22.04 LTS","Ubuntu 20.04 LTS","RHEL 8","CentOS 7","Oracle Linux 8","Windows Server 2022","Windows Server 2019","Storage OS 2.1","Cisco ASA 9.16","NX-OS 9.3","JunOS 21.2","ONTAP 9.10","Other"]
        },
        { 
          column_name: 'dc_site', 
          data_type: 'text', 
          is_nullable: 'NO',
          column_default: null,
          is_enum: true,
          enum_values: ["DC-East","DC-West","DC-North","DC-South","DC-Central","DC1","DC2","DC3","DC4","DC5"]
        },
        { 
          column_name: 'dc_building', 
          data_type: 'text', 
          is_nullable: 'YES',
          column_default: null,
          is_enum: true,
          enum_values: ["Building-A","Building-B","Building-C","Building-D","Building-E","Other"]
        },
        { 
          column_name: 'allocation', 
          data_type: 'select', 
          is_nullable: 'YES',
          column_default: null,
          is_enum: true,
          enum_values: ['IAAS', 'PAAS', 'SAAS', 'Load Balancer', 'Database']
        },
        { 
          column_name: 'status', 
          data_type: 'select', 
          is_nullable: 'NO',
          column_default: 'Active',
          is_enum: true,
          enum_values: ["Active","Ready","Inactive","Maintenance","Decommissioned","Retired"]
        },
        { 
          column_name: 'device_type', 
          data_type: 'select', 
          is_nullable: 'NO',
          column_default: null,
          is_enum: true,
          enum_values: ["Server","Storage","Network"]
        },
        { 
          column_name: 'rack', 
          data_type: 'select', 
          is_nullable: 'YES',
          column_default: null,
          is_enum: true,
          enum_values: getRackEnumValues()
        },
        { 
          column_name: 'unit', 
          data_type: 'select', 
          is_nullable: 'YES',
          column_default: null,
          is_enum: true,
          enum_values: Array.from({length: 42}, (_, i) => `U${i+1}`)
        },
        { 
          column_name: 'environment', 
          data_type: 'select', 
          is_nullable: 'YES',
          column_default: null,
          is_enum: true,
          enum_values: ["Production","Testing","Pre-Production","Development"]
        },
        { 
          column_name: 'notes', 
          data_type: 'text', 
          is_nullable: 'YES',
          column_default: null,
          is_enum: false,
          enum_values: []
        }
      ];
      
      setColumns(fallbackColumns);
    } finally {
      setLoading(false);
    }
  }, [tableName, toast]);

  useEffect(() => {
    fetchTableSchema();
  }, [fetchTableSchema]);

  return { columns, loading, error, refetch: fetchTableSchema };
};
