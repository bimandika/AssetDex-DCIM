import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0'

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
}

// Interface for filter parameters
export interface ServerFilterParams {
  // Text search fields
  search?: string;
  
  // Exact match filters
  status?: string[];
  device_type?: string[];
  environment?: string[];
  allocation?: string[];
  dc_site?: string[];
  
  // Pagination
  page?: number;
  page_size?: number;
  
  // Sorting
  sort_by?: string;
  sort_direction?: 'asc' | 'desc';
}

export const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client with service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Verify authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const requestData = req.method === 'POST' 
      ? await req.json() 
      : Object.fromEntries(new URL(req.url).searchParams.entries())

    // Parse and validate filter parameters
    const {
      search = '',
      status = [],
      device_type = [],
      environment = [],
      allocation = [],
      dc_site = [],
      page = 1,
      page_size = 10,
      sort_by = 'created_at',
      sort_direction = 'desc'
    } = requestData as ServerFilterParams

    // Build the query
    let query = supabaseAdmin
      .from('servers')
      .select('*', { count: 'exact' })

    // Apply text search if provided
    if (search) {
      query = query.or(
        `hostname.ilike.%${search}%,` +
        `serial_number.ilike.%${search}%,` +
        `ip_address.ilike.%${search}%,` +
        `brand.ilike.%${search}%,` +
        `model.ilike.%${search}%`
      )
    }

    // Apply filters
    const filters = [
      { column: 'status', values: status },
      { column: 'device_type', values: device_type },
      { column: 'environment', values: environment },
      { column: 'allocation', values: allocation },
      { column: 'dc_site', values: dc_site }
    ]

    filters.forEach(({ column, values }) => {
      if (values && values.length > 0) {
        query = query.in(column, values)
      }
    })

    // Apply sorting
    if (sort_by) {
      query = query.order(sort_by, { ascending: sort_direction === 'asc' })
    }

    // Apply pagination
    const pageNum = Math.max(1, parseInt(page as any) || 1)
    const pageSize = Math.min(100, Math.max(1, parseInt(page_size as any) || 10))
    const from = (pageNum - 1) * pageSize
    const to = from + pageSize - 1

    query = query.range(from, to)

    // Execute the query
    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching servers:', error)
      throw new Error(error.message)
    }

    // Prepare response
    const totalItems = count || 0
    const totalPages = Math.ceil(totalItems / pageSize)

    const response = {
      data: data || [],
      pagination: {
        current_page: pageNum,
        page_size: pageSize,
        total_items: totalItems,
        total_pages: totalPages,
        has_next_page: pageNum < totalPages,
        has_prev_page: pageNum > 1
      }
    }

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('Error in filter-servers function:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        details: error.details || null
      }),
      { 
        status: error.status || 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
}

// For local testing with Deno
deno.serve(handler)
