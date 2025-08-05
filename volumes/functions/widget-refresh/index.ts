import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Widget refresh: Starting widget data refresh')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get all widgets that need refresh (expired or no cache)
    const { data: widgets, error: widgetsError } = await supabase
      .from('dashboard_widgets')
      .select(`
        id,
        widget_type,
        title,
        data_source,
        config,
        filters
      `)
      .in('widget_type', ['chart', 'metric'])

    if (widgetsError) {
      console.error('Widget refresh: Error fetching widgets:', widgetsError)
      throw widgetsError
    }

    console.log(`Widget refresh: Found ${widgets?.length || 0} widgets to process`)

    const refreshPromises = widgets?.map(async (widget) => {
      try {
        console.log(`Widget refresh: Processing widget ${widget.id} (${widget.widget_type})`)

        // Check if cache exists and is still valid
        const { data: existingCache } = await supabase
          .from('widget_data_cache')
          .select('expires_at')
          .eq('widget_id', widget.id)
          .single()

        if (existingCache && new Date(existingCache.expires_at) > new Date()) {
          console.log(`Widget refresh: Widget ${widget.id} cache still valid, skipping`)
          return
        }

        // Compute fresh data based on widget configuration
        let computedData = null
        const dataSource = widget.data_source || {}
        const filters = widget.filters || []

        if (widget.widget_type === 'chart') {
          // Chart widgets
          computedData = await computeChartData(supabase, dataSource, filters)
        } else if (widget.widget_type === 'metric') {
          // Metric widgets - simplified for stat display
          computedData = await computeMetricData(supabase, dataSource, filters)
        }

        if (computedData) {
          // Store/update cached data
          const { error: cacheError } = await supabase
            .from('widget_data_cache')
            .upsert({
              widget_id: widget.id,
              data: computedData,
              computed_at: new Date().toISOString(),
              expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'widget_id'
            })

          if (cacheError) {
            console.error(`Widget refresh: Error caching data for widget ${widget.id}:`, cacheError)
          } else {
            console.log(`Widget refresh: Successfully cached data for widget ${widget.id}`)
          }
        }
      } catch (err) {
        console.error(`Widget refresh: Error processing widget ${widget.id}:`, err)
      }
    }) || []

    await Promise.all(refreshPromises)

    console.log('Widget refresh: Completed widget data refresh')

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Refreshed ${widgets?.length || 0} widgets`,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error: any) {
    console.error('Widget refresh: Error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
}

async function computeChartData(supabase: any, dataSource: any, filters: any[]) {
  const table = dataSource.table || 'servers'
  const groupBy = dataSource.groupBy || 'status'
  const aggregation = dataSource.aggregation || 'count'

  // Build the query
  let query = supabase.from(table).select(groupBy)

  // Apply filters
  filters.forEach(filter => {
    const { field, value, operator } = filter
    switch (operator) {
      case 'equals':
        query = query.eq(field, value)
        break
      case 'not_equals':
        query = query.neq(field, value)
        break
      case 'contains':
        query = query.ilike(field, `%${value}%`)
        break
    }
  })

  const { data, error } = await query

  if (error) {
    console.error('Widget refresh: Database query error:', error)
    throw error
  }

  // Process data into chart format
  const groupedData: { [key: string]: number } = {}
  
  data?.forEach((row: any) => {
    const key = row[groupBy] || 'Unknown'
    groupedData[key] = (groupedData[key] || 0) + 1
  })

  const labels = Object.keys(groupedData)
  const values = Object.values(groupedData)
  const total = values.reduce((sum, val) => sum + val, 0)

  return {
    labels,
    datasets: [{
      label: `${groupBy} distribution`,
      data: values,
      backgroundColor: [
        'rgba(59, 130, 246, 0.8)',
        'rgba(16, 185, 129, 0.8)',
        'rgba(245, 158, 11, 0.8)',
        'rgba(239, 68, 68, 0.8)',
        'rgba(139, 92, 246, 0.8)',
        'rgba(236, 72, 153, 0.8)'
      ]
    }],
    total
  }
}

async function computeMetricData(supabase: any, dataSource: any, filters: any[]) {
  const table = dataSource.table || 'servers'
  const groupBy = dataSource.groupBy || 'status'

  // Build the query
  let query = supabase.from(table).select('*')

  // Apply filters
  filters.forEach(filter => {
    const { field, value, operator } = filter
    switch (operator) {
      case 'equals':
        query = query.eq(field, value)
        break
      case 'not_equals':
        query = query.neq(field, value)
        break
      case 'contains':
        query = query.ilike(field, `%${value}%`)
        break
    }
  })

  const { data, error, count } = await query

  if (error) {
    console.error('Widget refresh: Database query error:', error)
    throw error
  }

  // For metric widgets, return simple count
  return {
    value: count || data?.length || 0,
    timestamp: new Date().toISOString()
  }
}
