import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0'

// Type definitions
interface ColumnDefinition {
  column_name: string
  udt_name: string
  is_nullable: 'YES' | 'NO'
  column_default: string | null
  ordinal_position: number
}

interface EnumType {
  typname: string
  enumlabel: string
}

interface TransformedColumn {
  column_name: string
  data_type: string
  is_nullable: 'YES' | 'NO'
  column_default: string | null
  is_enum: boolean
  enum_values: string[]
}

type EnumValuesMap = Record<string, string[]>

// Deno environment type declarations
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve?: (handler: (req: Request) => Promise<Response> | Response) => void;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS'
}

// Helper function to map PostgreSQL types to frontend types
const mapDbTypeToPropertyType = (dataType: string | null | undefined): string => {
  // Default to 'text' if dataType is not provided or not a string
  if (!dataType || typeof dataType !== 'string') {
    return 'text';
  }
  
  const typeMap: Record<string, string> = {
    'text': 'text',
    'varchar': 'text',
    'character varying': 'text',
    'integer': 'number',
    'bigint': 'number',
    'numeric': 'number',
    'boolean': 'boolean',
    'date': 'date',
    'timestamp with time zone': 'date',
    'timestamp without time zone': 'date',
    'jsonb': 'json',
    'json': 'json',
    'uuid': 'text',  // Add UUID type mapping
  }
  
  return typeMap[dataType.toLowerCase()] || 'text'
}

// This is the main handler function that will be called by the main function
export const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing required environment variables')
    }

    const supabaseClient = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Get the table name from query params, default to 'servers'
    const url = new URL(req.url)
    const tableName = url.searchParams.get('table') || 'servers'

    // Query the database using the RPC function with proper error handling
    const { data: columns, error } = await supabaseClient.rpc('get_table_schema', {
      p_table_name: tableName
    });

    if (error) {
      console.error('Error calling get_table_schema RPC:', error);
      throw error;
    }
    
    if (!columns || columns.length === 0) {
      throw new Error(`No columns found for table: ${tableName}`);
    }
    
    // Get enum values from the database
    console.log('Fetching enum values...');
    const { data: enumData, error: enumError } = await supabaseClient.rpc('get_enum_values');
    
    if (enumError) {
      console.error('Error fetching enum values:', enumError);
    } else {
      console.log('Raw enum data from database:', JSON.stringify(enumData, null, 2));
    }
    
    // Group enum values by type for easier lookup
    const enumValues: EnumValuesMap = {};
    
    if (enumData && typeof enumData === 'object') {
      // The get_enum_values function returns a JSON object with enum types as keys
      // and arrays of values as values
      Object.entries(enumData).forEach(([enumName, values]) => {
        if (Array.isArray(values)) {
          enumValues[enumName] = values;
          console.log(`Mapped enum '${enumName}' with ${values.length} values`);
        } else {
          console.log(`Skipping non-array value for enum '${enumName}':`, values);
        }
      });
      
      console.log('Processed enum values:', JSON.stringify(enumValues, null, 2));
    } else {
      console.log('No enum data returned from get_enum_values()');
    }

    // Map column names to their corresponding enum types (for legacy columns)
    const columnToEnumMap: Record<string, string> = {
      'status': 'status',
      'device_type': 'deviceTypes',
      'allocation': 'allocationTypes',
      'environment': 'environmentTypes',
      'brand': 'brands',
      'model': 'models',
      'operating_system': 'osTypes',
      'dc_site': 'sites',
      'dc_building': 'buildings',
      'dc_floor': 'floors',
      'dc_room': 'rooms',
      'rack': 'racks',
      'unit': 'units'
    };

    // Transform the data for the frontend
    const transformedColumns: TransformedColumn[] = columns.map((column: any) => {
      // First check if this column has enum values based on legacy mapping
      let enumType = columnToEnumMap[column.column_name];
      let isEnum = !!enumType && enumValues[enumType]?.length > 0;
      let enumValuesForColumn = isEnum ? enumValues[enumType] : [];
      
      // If not found in legacy mapping, check if column name directly matches an enum type
      if (!isEnum && enumValues[column.column_name]?.length > 0) {
        enumType = column.column_name;
        isEnum = true;
        enumValuesForColumn = enumValues[column.column_name];
      }
      
      // Special case for status which might have a default value in the format 'Active'::server_status
      let defaultValue = column.column_default;
      if (column.column_name === 'status' && defaultValue && defaultValue.includes('::')) {
        defaultValue = defaultValue.split('::')[0].replace(/'/g, '').trim();
      }
      
      // Determine the data type - use 'select' for enum columns, otherwise map the DB type
      let dataType: string;
      if (isEnum) {
        dataType = 'select';
      } else {
        dataType = mapDbTypeToPropertyType(column.udt_name);
      }
      
      return {
        column_name: column.column_name,
        data_type: dataType,
        is_nullable: column.is_nullable,
        column_default: defaultValue,
        is_enum: isEnum,
        enum_values: enumValuesForColumn
      };
    })

    return new Response(
      JSON.stringify({ data: transformedColumns }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Error in get-table-schema function:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An error occurred while fetching table schema',
        details: error.details || null
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: error.status || 500,
      },
    )
  }
}

// For local testing with: deno run --allow-net --allow-env index.ts
if (typeof Deno.serve === 'function') {
  Deno.serve(handler);
}

export default handler;
