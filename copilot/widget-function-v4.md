# Plan: Implementing Widget Functionality v4 (Final)

This plan outlines the steps to enhance the widget data flow, prioritizing manageability by keeping business logic within the Edge Function while leveraging existing functionality for dynamic schema discovery.

## 1. Backend: Enhance `widget-data` Edge Function

The existing `widget-data` Edge Function will be refactored to use the existing `get-table-schema` function for dynamic schema discovery. The data aggregation logic will be kept within this function.

**File to Modify:** `volumes/functions/widget-data/index.ts`

### Enhancement 1.1: Backend-Side Aggregation (User Preference)

**Objective:** Keep data aggregation logic within the Edge Function for centralized management.

**Implementation Details:**

*   **Fetch Raw Data:** The function will query the database for the raw data needed for the widget.
*   **Process in TypeScript:** The `processGroupedData` function (or similar logic) will be used to loop through the raw data and perform the necessary aggregations (`count`, `sum`, etc.) and grouping.
*   **No Change to Aggregation Logic:** The existing approach of handling aggregation within the function will be maintained.

### Enhancement 1.2: Utilize Existing `get-table-schema` Function

**Objective:** Remove hardcoded schema information and use the existing `get-table-schema` Edge Function for dynamic discovery.

**Implementation Details:**

*   **Invoke `get-table-schema`:** When handling `action=tables` requests, the `widget-data` function will invoke the `get-table-schema` function using an internal fetch request.
*   **Data Transformation:** The response from the `get-table-schema` function will be transformed into the nested JSON structure expected by the frontend.

---

### **Before Code**

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0'

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
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
}

interface QueryConfig {
  table: string;
  groupBy?: string;
  aggregation?: 'count' | 'sum' | 'avg' | 'min' | 'max';
  filters?: FilterConfig[];
  dateRange?: {
    field: string;
    start: string;
    end: string;
  };
  selectFields?: string[];
  limit?: number;
}

interface FilterConfig {
  field: string;
  operator: 'equals' | 'contains' | 'in' | 'gt' | 'lt' | 'gte' | 'lte';
  value: string | string[] | number;
}

// This is the main handler function that will be called by the main function
export const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
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

    const url = new URL(req.url)
    const action = url.searchParams.get('action') || 'query'

    if (req.method === 'POST') {
      const body = await req.json()

      if (action === 'query') {
        // Handle nested config structure and normalize table name
        let config: QueryConfig = body.config || body
        
        // Ensure table is always set for server data
        if (!config.table) {
          config.table = 'servers'
        }
        
        console.log('Widget data: Received config:', JSON.stringify(config, null, 2))
        console.log('Widget data: Table name:', config.table)
        
        // Map field names to actual database columns
        config = normalizeConfig(config)
        console.log('Widget data: Normalized config:', JSON.stringify(config, null, 2))
        
        // Use the database function for server data
        if (config.table === 'servers') {
          const { data, error } = await supabaseClient
            .rpc('get_server_data', {
              p_filters: config.filters || [],
              p_group_by: config.groupBy || null,
              p_aggregation: config.aggregation || 'count',
              p_date_range: config.dateRange || {}
            })

          if (error) {
            console.error('Widget data: Server query error:', error)
            throw error
          }

          // Transform data for chart widgets
          let transformedData = data || []
          
          // For chart widgets, transform to Chart.js format
          if (config.groupBy) {
            transformedData = {
              labels: (data || []).map((item: any) => item.group_value),
              datasets: [{
                label: config.aggregation === 'count' ? 'Count' : config.aggregation?.toUpperCase(),
                data: (data || []).map((item: any) => item.aggregated_value),
                backgroundColor: [
                  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
                  '#06B6D4', '#F97316', '#84CC16', '#EC4899', '#6B7280'
                ],
                borderColor: [
                  '#2563EB', '#DC2626', '#059669', '#D97706', '#7C3AED',
                  '#0891B2', '#EA580C', '#65A30D', '#DB2777', '#4B5563'
                ],
                borderWidth: 1
              }],
              total: (data || []).reduce((sum: number, item: any) => sum + item.aggregated_value, 0)
            }
          }

          return new Response(
            JSON.stringify({ 
              success: true, 
              data: transformedData,
              config: config
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            },
          )
        }

        // For other tables, build query dynamically
        else {
          const result = await executeCustomQuery(supabaseClient, config)
          return new Response(
            JSON.stringify({ 
              success: true, 
              data: result,
              config: config
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            },
          )
        }
      }

      else if (action === 'schema') {
        // Get table schema information
        const tableName = body.table || body.config?.table || 'servers'
        const schema = await getTableSchema(supabaseClient, tableName)
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            data: schema
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        )
      }

      else if (action === 'timeline') {
        // Special timeline data query - always use servers table
        let config: QueryConfig = { 
          table: 'servers',
          groupBy: 'created_at',
          aggregation: 'count',
          ...body.config,
          ...body
        }
        
        // Normalize field names
        config = normalizeConfig(config)
        console.log('Widget data: Timeline config:', JSON.stringify(config, null, 2))
        
        const timelineData = await getTimelineData(supabaseClient, config)
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            data: timelineData,
            config: config
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        )
      }

      else if (action === 'rack_utilization') {
        // Handle rack utilization requests - always use servers table
        let config: QueryConfig = { 
          table: 'servers',
          groupBy: 'rack',
          aggregation: 'count',
          filters: body.filters || [],
          ...body.config,
          ...body
        }
        
        // Normalize field names
        config = normalizeConfig(config)
        console.log('Widget data: Rack utilization config:', JSON.stringify(config, null, 2))
        
        const { data, error } = await supabaseClient
          .rpc('get_server_data', {
            p_filters: config.filters || [],
            p_group_by: config.groupBy || 'rack',
            p_aggregation: config.aggregation || 'count',
            p_date_range: config.dateRange || {}
          })

        if (error) {
          console.error('Widget data: Rack utilization error:', error)
          throw error
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            data: data || [],
            config: config
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        )
      }
    }

    // GET requests - Get available tables and fields
    else if (req.method === 'GET') {
      if (action === 'tables') {
        const availableTables = {
          servers: {
            label: 'Servers',
            fields: [
              { name: 'hostname', type: 'text', label: 'Hostname' },
              { name: 'brand', type: 'text', label: 'Brand' },
              { name: 'device_type', type: 'enum', label: 'Device Type' },
              { name: 'environment', type: 'enum', label: 'Environment' },
              { name: 'dc_site', type: 'text', label: 'Site' },
              { name: 'dc_building', type: 'text', label: 'Building' },
              { name: 'dc_floor', type: 'text', label: 'Floor' },
              { name: 'dc_room', type: 'text', label: 'Room' },
              { name: 'rack_position', type: 'text', label: 'Rack Position' },
              { name: 'deployment_date', type: 'date', label: 'Deployment Date' },
              { name: 'installation_date', type: 'date', label: 'Installation Date' },
              { name: 'server_status', type: 'enum', label: 'Status' },
              { name: 'created_at', type: 'timestamp', label: 'Created At' }
            ]
          },
          rack_metadata: {
            label: 'Rack Metadata',
            fields: [
              { name: 'rack_name', type: 'text', label: 'Rack Name' },
              { name: 'dc_site', type: 'text', label: 'Site' },
              { name: 'dc_building', type: 'text', label: 'Building' },
              { name: 'dc_floor', type: 'text', label: 'Floor' },
              { name: 'dc_room', type: 'text', label: 'Room' },
              { name: 'description', type: 'text', label: 'Description' }
            ]
          }
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            data: availableTables
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        )
      }
    }

    // Invalid action or method
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Invalid action or method'
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )

  } catch (error) {
    console.error('Widget data error:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Internal server error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
}

// Normalize field names to match actual database columns
function normalizeConfig(config: QueryConfig): QueryConfig {
  const fieldMapping: { [key: string]: string } = {
    'server_status': 'status',
    'deployment_status': 'status', // fallback to status
    'server_brand': 'brand',
    'device_types': 'device_type'
  }
  
  // Normalize groupBy field
  if (config.groupBy && fieldMapping[config.groupBy]) {
    config.groupBy = fieldMapping[config.groupBy]
  }
  
  // Normalize filter fields
  if (config.filters) {
    config.filters = config.filters.map(filter => ({
      ...filter,
      field: fieldMapping[filter.field] || filter.field
    }))
  }
  
  // Normalize selectFields
  if (config.selectFields) {
    config.selectFields = config.selectFields.map(field => 
      fieldMapping[field] || field
    )
  }
  
  return config
}

// Execute custom query for non-server tables
async function executeCustomQuery(supabaseClient: any, config: QueryConfig) {
  let query = supabaseClient.from(config.table)

  // Apply select fields
  const selectFields = config.selectFields?.join(', ') || '*'
  query = query.select(selectFields)

  // Apply filters
  if (config.filters?.length) {
    for (const filter of config.filters) {
      switch (filter.operator) {
        case 'equals':
          query = query.eq(filter.field, filter.value)
          break
        case 'contains':
          query = query.ilike(filter.field, `%${filter.value}%`)
          break
        case 'in':
          if (Array.isArray(filter.value)) {
            query = query.in(filter.field, filter.value)
          } else if (typeof filter.value === 'string') {
            // Handle string representation of arrays
            try {
              const parsed = JSON.parse(filter.value)
              if (Array.isArray(parsed)) {
                query = query.in(filter.field, parsed)
              } else {
                query = query.in(filter.field, [filter.value])
              }
            } catch {
              query = query.in(filter.field, [filter.value])
            }
          }
          break
        case 'gt':
          query = query.gt(filter.field, filter.value)
          break
        case 'lt':
          query = query.lt(filter.field, filter.value)
          break
        case 'gte':
          query = query.gte(filter.field, filter.value)
          break
        case 'lte':
          query = query.lte(filter.field, filter.value)
          break
      }
    }
  }

  // Apply date range filter
  if (config.dateRange?.field && config.dateRange?.start && config.dateRange?.end) {
    query = query
      .gte(config.dateRange.field, config.dateRange.start)
      .lte(config.dateRange.field, config.dateRange.end)
  }

  // Apply limit
  if (config.limit) {
    query = query.limit(config.limit)
  }

  const { data, error } = await query

  if (error) throw error

  // If groupBy is specified, process the data for aggregation
  if (config.groupBy && data) {
    return processGroupedData(data, config)
  }

  return data || []
}

// Process data for grouping and aggregation
function processGroupedData(data: any[], config: QueryConfig) {
  const grouped = data.reduce((acc, item) => {
    const groupValue = item[config.groupBy!] || 'Unknown'
    
    if (!acc[groupValue]) {
      acc[groupValue] = []
    }
    acc[groupValue].push(item)
    
    return acc
  }, {})

  return Object.entries(grouped).map(([group_value, items]) => {
    const itemsArray = items as any[]
    let aggregated_value = itemsArray.length // default to count
    
    if (config.aggregation === 'sum' && itemsArray.length > 0) {
      // For sum, we'd need a numeric field - defaulting to count for now
      aggregated_value = itemsArray.length
    } else if (config.aggregation === 'avg' && itemsArray.length > 0) {
      // For avg, we'd need a numeric field - defaulting to count for now
      aggregated_value = itemsArray.length
    }
    
    return {
      group_value,
      aggregated_value,
      record_count: itemsArray.length
    }
  })
}

// Get table schema information
async function getTableSchema(supabaseClient: any, tableName: string) {
  // This is a simplified schema - in production, you might query information_schema
  const schemas = {
    servers: [
      { column_name: 'id', data_type: 'uuid', is_nullable: false },
      { column_name: 'hostname', data_type: 'text', is_nullable: false },
      { column_name: 'brand', data_type: 'text', is_nullable: true },
      { column_name: 'device_type', data_type: 'device_type', is_nullable: true },
      { column_name: 'environment', data_type: 'environment_type', is_nullable: true },
      { column_name: 'dc_site', data_type: 'text', is_nullable: true },
      { column_name: 'dc_building', data_type: 'text', is_nullable: true },
      { column_name: 'dc_floor', data_type: 'text', is_nullable: true },
      { column_name: 'dc_room', data_type: 'text', is_nullable: true },
      { column_name: 'deployment_date', data_type: 'date', is_nullable: true },
      { column_name: 'server_status', data_type: 'server_status', is_nullable: true },
    ],
    rack_metadata: [
      { column_name: 'id', data_type: 'uuid', is_nullable: false },
      { column_name: 'rack_name', data_type: 'text', is_nullable: false },
      { column_name: 'dc_site', data_type: 'text', is_nullable: true },
      { column_name: 'dc_building', data_type: 'text', is_nullable: true },
      { column_name: 'dc_floor', data_type: 'text', is_nullable: true },
      { column_name: 'dc_room', data_type: 'text', is_nullable: true },
    ]
  }

  return schemas[tableName as keyof typeof schemas] || []
}

// Get timeline-specific data
async function getTimelineData(supabaseClient: any, config: QueryConfig) {
  // For timeline widgets, we need actual server records, not aggregated data
  let query = supabaseClient
    .from('servers')
    .select('id, hostname, brand, model, status, created_at, updated_at, rack, dc_site')
    .order('created_at', { ascending: false })
    .limit(20) // Limit to recent 20 events

  // Apply filters
  if (config.filters?.length) {
    for (const filter of config.filters) {
      switch (filter.operator) {
        case 'equals':
          query = query.eq(filter.field, filter.value)
          break
        case 'gte':
          query = query.gte(filter.field, filter.value)
          break
        case 'lte':
          query = query.lte(filter.field, filter.value)
          break
      }
    }
  }

  const { data, error } = await query

  if (error) throw error

  // Transform server records into timeline events
  return (data || []).map((server: any) => ({
    id: server.id,
    title: `Server ${server.hostname || 'Unknown'}`,
    description: `${server.brand || ''} ${server.model || ''} - ${server.status || 'Unknown Status'}`.trim(),
    timestamp: server.created_at,
    category: 'server',
    server_id: server.id,
    server_name: server.hostname,
    rack_name: server.rack,
    room_name: server.dc_site
  }))
}

// Main function that serves the handler
if (Deno.serve) {
  Deno.serve(handler)
}
```

---

### **After Code**

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0'

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
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
}

interface QueryConfig {
  table: string;
  groupBy?: string;
  aggregation?: 'count' | 'sum' | 'avg' | 'min' | 'max';
  filters?: FilterConfig[];
  dateRange?: {
    field: string;
    start: string;
    end: string;
  };
  selectFields?: string[];
  limit?: number;
}

interface FilterConfig {
  field: string;
  operator: 'equals' | 'contains' | 'in' | 'gt' | 'lt' | 'gte' | 'lte';
  value: string | string[] | number;
}

// This is the main handler function that will be called by the main function
export const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
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

    const url = new URL(req.url)
    const action = url.searchParams.get('action') || 'query'

    if (req.method === 'POST') {
      const body = await req.json()

      if (action === 'query') {
        // Handle nested config structure and normalize table name
        let config: QueryConfig = body.config || body
        
        // Ensure table is always set for server data
        if (!config.table) {
          config.table = 'servers'
        }
        
        console.log('Widget data: Received config:', JSON.stringify(config, null, 2))
        console.log('Widget data: Table name:', config.table)
        
        // Map field names to actual database columns
        config = normalizeConfig(config)
        console.log('Widget data: Normalized config:', JSON.stringify(config, null, 2))
        
        // Use the database function for server data
        if (config.table === 'servers') {
          const { data, error } = await supabaseClient
            .rpc('get_server_data', {
              p_filters: config.filters || [],
              p_group_by: config.groupBy || null,
              p_aggregation: config.aggregation || 'count',
              p_date_range: config.dateRange || {}
            })

          if (error) {
            console.error('Widget data: Server query error:', error)
            throw error
          }

          // Transform data for chart widgets
          let transformedData = data || []
          
          // For chart widgets, transform to Chart.js format
          if (config.groupBy) {
            transformedData = {
              labels: (data || []).map((item: any) => item.group_value),
              datasets: [{
                label: config.aggregation === 'count' ? 'Count' : config.aggregation?.toUpperCase(),
                data: (data || []).map((item: any) => item.aggregated_value),
                backgroundColor: [
                  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
                  '#06B6D4', '#F97316', '#84CC16', '#EC4899', '#6B7280'
                ],
                borderColor: [
                  '#2563EB', '#DC2626', '#059669', '#D97706', '#7C3AED',
                  '#0891B2', '#EA580C', '#65A30D', '#DB2777', '#4B5563'
                ],
                borderWidth: 1
              }],
              total: (data || []).reduce((sum: number, item: any) => sum + item.aggregated_value, 0)
            }
          }

          return new Response(
            JSON.stringify({ 
              success: true, 
              data: transformedData,
              config: config
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            },
          )
        }

        // For other tables, build query dynamically
        else {
          const result = await executeCustomQuery(supabaseClient, config)
          return new Response(
            JSON.stringify({ 
              success: true, 
              data: result,
              config: config
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            },
          )
        }
      }

      else if (action === 'schema') {
        // Get table schema information
        const tableName = body.table || body.config?.table || 'servers'
        const schema = await getTableSchema(supabaseClient, tableName)
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            data: schema
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        )
      }

      else if (action === 'timeline') {
        // Special timeline data query - always use servers table
        let config: QueryConfig = { 
          table: 'servers',
          groupBy: 'created_at',
          aggregation: 'count',
          ...body.config,
          ...body
        }
        
        // Normalize field names
        config = normalizeConfig(config)
        console.log('Widget data: Timeline config:', JSON.stringify(config, null, 2))
        
        const timelineData = await getTimelineData(supabaseClient, config)
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            data: timelineData,
            config: config
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        )
      }

      else if (action === 'rack_utilization') {
        // Handle rack utilization requests - always use servers table
        let config: QueryConfig = { 
          table: 'servers',
          groupBy: 'rack',
          aggregation: 'count',
          filters: body.filters || [],
          ...body.config,
          ...body
        }
        
        // Normalize field names
        config = normalizeConfig(config)
        console.log('Widget data: Rack utilization config:', JSON.stringify(config, null, 2))
        
        const { data, error } = await supabaseClient
          .rpc('get_server_data', {
            p_filters: config.filters || [],
            p_group_by: config.groupBy || 'rack',
            p_aggregation: config.aggregation || 'count',
            p_date_range: config.dateRange || {}
          })

        if (error) {
          console.error('Widget data: Rack utilization error:', error)
          throw error
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            data: data || [],
            config: config
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        )
      }
    }

    // GET requests - Get available tables and fields
    else if (req.method === 'GET') {
        if (action === 'tables') {
            const { data: serversSchema, error: serversError } = await supabaseClient.functions.invoke('get-table-schema', {
                body: { table: 'servers' },
            });
            if (serversError) throw new Error(`Failed to fetch schema for servers: ${serversError.message}`);

            const { data: rackSchema, error: rackError } = await supabaseClient.functions.invoke('get-table-schema', {
                body: { table: 'rack_metadata' },
            });
            if (rackError) throw new Error(`Failed to fetch schema for rack_metadata: ${rackError.message}`);

            const formatFields = (schemaData: any) => {
                if (!schemaData || !schemaData.data) return [];
                return schemaData.data.map((col: any) => ({
                    name: col.column_name,
                    type: col.data_type,
                    label: col.column_name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                }));
            };

            const availableTables = {
                servers: {
                    label: 'Servers',
                    fields: formatFields(serversSchema)
                },
                rack_metadata: {
                    label: 'Rack Metadata',
                    fields: formatFields(rackSchema)
                }
            };

            return new Response(
                JSON.stringify({
                    success: true,
                    data: availableTables
                }),
                {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                },
            );
        }
    }

    // Invalid action or method
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Invalid action or method'
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )

  } catch (error) {
    console.error('Widget data error:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Internal server error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
}

// Normalize field names to match actual database columns
function normalizeConfig(config: QueryConfig): QueryConfig {
  const fieldMapping: { [key: string]: string } = {
    'server_status': 'status',
    'deployment_status': 'status', // fallback to status
    'server_brand': 'brand',
    'device_types': 'device_type'
  }
  
  // Normalize groupBy field
  if (config.groupBy && fieldMapping[config.groupBy]) {
    config.groupBy = fieldMapping[config.groupBy]
  }
  
  // Normalize filter fields
  if (config.filters) {
    config.filters = config.filters.map(filter => ({
      ...filter,
      field: fieldMapping[filter.field] || filter.field
    }))
  }
  
  // Normalize selectFields
  if (config.selectFields) {
    config.selectFields = config.selectFields.map(field => 
      fieldMapping[field] || field
    )
  }
  
  return config
}

// Execute custom query for non-server tables
async function executeCustomQuery(supabaseClient: any, config: QueryConfig) {
  let query = supabaseClient.from(config.table)

  // Apply select fields
  const selectFields = config.selectFields?.join(', ') || '*'
  query = query.select(selectFields)

  // Apply filters
  if (config.filters?.length) {
    for (const filter of config.filters) {
      switch (filter.operator) {
        case 'equals':
          query = query.eq(filter.field, filter.value)
          break
        case 'contains':
          query = query.ilike(filter.field, `%${filter.value}%`)
          break
        case 'in':
          if (Array.isArray(filter.value)) {
            query = query.in(filter.field, filter.value)
          } else if (typeof filter.value === 'string') {
            // Handle string representation of arrays
            try {
              const parsed = JSON.parse(filter.value)
              if (Array.isArray(parsed)) {
                query = query.in(filter.field, parsed)
              } else {
                query = query.in(filter.field, [filter.value])
              }
            } catch {
              query = query.in(filter.field, [filter.value])
            }
          }
          break
        case 'gt':
          query = query.gt(filter.field, filter.value)
          break
        case 'lt':
          query = query.lt(filter.field, filter.value)
          break
        case 'gte':
          query = query.gte(filter.field, filter.value)
          break
        case 'lte':
          query = query.lte(filter.field, filter.value)
          break
      }
    }
  }

  // Apply date range filter
  if (config.dateRange?.field && config.dateRange?.start && config.dateRange?.end) {
    query = query
      .gte(config.dateRange.field, config.dateRange.start)
      .lte(config.dateRange.field, config.dateRange.end)
  }

  // Apply limit
  if (config.limit) {
    query = query.limit(config.limit)
  }

  const { data, error } = await query

  if (error) throw error

  // If groupBy is specified, process the data for aggregation
  if (config.groupBy && data) {
    return processGroupedData(data, config)
  }

  return data || []
}

// Process data for grouping and aggregation
function processGroupedData(data: any[], config: QueryConfig) {
  const grouped = data.reduce((acc, item) => {
    const groupValue = item[config.groupBy!] || 'Unknown'
    
    if (!acc[groupValue]) {
      acc[groupValue] = []
    }
    acc[groupValue].push(item)
    
    return acc
  }, {})

  return Object.entries(grouped).map(([group_value, items]) => {
    const itemsArray = items as any[]
    let aggregated_value = itemsArray.length // default to count
    
    if (config.aggregation === 'sum' && itemsArray.length > 0) {
      // For sum, we'd need a numeric field - defaulting to count for now
      aggregated_value = itemsArray.length
    } else if (config.aggregation === 'avg' && itemsArray.length > 0) {
      // For avg, we'd need a numeric field - defaulting to count for now
      aggregated_value = itemsArray.length
    }
    
    return {
      group_value,
      aggregated_value,
      record_count: itemsArray.length
    }
  })
}

// Get table schema information
async function getTableSchema(supabaseClient: any, tableName: string) {
    const { data, error } = await supabaseClient.functions.invoke('get-table-schema', {
        body: { table: tableName },
    });
    if (error) throw new Error(`Failed to fetch schema for ${tableName}: ${error.message}`);
    return data;
}

// Get timeline-specific data
async function getTimelineData(supabaseClient: any, config: QueryConfig) {
  // For timeline widgets, we need actual server records, not aggregated data
  let query = supabaseClient
    .from('servers')
    .select('id, hostname, brand, model, status, created_at, updated_at, rack, dc_site')
    .order('created_at', { ascending: false })
    .limit(20) // Limit to recent 20 events

  // Apply filters
  if (config.filters?.length) {
    for (const filter of config.filters) {
      switch (filter.operator) {
        case 'equals':
          query = query.eq(filter.field, filter.value)
          break
        case 'gte':
          query = query.gte(filter.field, filter.value)
          break
        case 'lte':
          query = query.lte(filter.field, filter.value)
          break
      }
    }
  }

  const { data, error } = await query

  if (error) throw error

  // Transform server records into timeline events
  return (data || []).map((server: any) => ({
    id: server.id,
    title: `Server ${server.hostname || 'Unknown'}`,
    description: `${server.brand || ''} ${server.model || ''} - ${server.status || 'Unknown Status'}`.trim(),
    timestamp: server.created_at,
    category: 'server',
    server_id: server.id,
    server_name: server.hostname,
    rack_name: server.rack,
    room_name: server.dc_site
  }))
}

// Main function that serves the handler
if (Deno.serve) {
  Deno.serve(handler)
}
```

---

## 2. Database: No Changes Required

The existing `get_table_schema` and `get_enum_values` RPC functions in the database are sufficient. No database changes are required.

## 3. Frontend: No Changes Required

The proposed backend changes are non-breaking. The frontend will continue to send the same requests and receive data in the same format.

## 4. Testing and Verification

After implementing the changes, the following steps will be taken to verify the functionality:

1.  **Deploy Edge Function:** Deploy the updated `widget-data` Edge Function.
2.  **Verify Dynamic Schema:** Make a GET request to `/functions/v1/widget-data?action=tables` and confirm that the response contains the dynamically fetched schema information.
3.  **Verify Aggregation:**
    *   Create a chart widget that groups data (e.g., servers by status).
    *   Confirm that the widget displays the correct data.
4.  **Regression Testing:** Test all existing widget types to ensure they continue to function as expected.