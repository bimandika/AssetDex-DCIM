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
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
}

// Defensive patch: Remove any id or *_id fields that are undefined or 'undefined' (string)
function cleanUUIDFields(obj: any) {
  for (const key in obj) {
    if ((key.endsWith('id') || key === 'id')) {
      // Remove if not a valid UUID (except dashboard_id, which may be required)
      if (!isValidUUID(obj[key])) {
        delete obj[key];
      }
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      cleanUUIDFields(obj[key]);
    }
  }
  return obj;
}

// Helper: Validate UUID format
function isValidUUID(uuid: any) {
  return typeof uuid === 'string' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(uuid);
}

// Dashboard management Edge Function
export const handler = async (req: Request): Promise<Response> => {
  console.log('Dashboard manager: Request received', {
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers.entries())
  })

  if (req.method === 'OPTIONS') {
    console.log('Dashboard manager: Handling CORS preflight')
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    let action = url.searchParams.get('action') || 'list'
    let requestData: any = null
    
    // For POST requests, try to get action from body first
    if (req.method === 'POST') {
      try {
        const bodyText = await req.text()
        if (bodyText) {
          requestData = JSON.parse(bodyText)
          // If action is in the body, use that instead of URL param
          if (requestData && requestData.action) {
            action = requestData.action
          } else if (!url.searchParams.get('action')) {
            // No action in body or URL, default to 'create'
            action = 'create'
          }
        }
      } catch (parseError) {
        console.error('Dashboard manager: Failed to parse body for action detection:', parseError)
        // If body parsing fails, fall back to URL params or default
        if (!url.searchParams.get('action')) {
          action = 'create'
        }
      }
    }
    
    console.log('Dashboard manager: Action requested:', action)
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    console.log('Dashboard manager: Environment check', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseKey,
      urlLength: supabaseUrl?.length,
      keyLength: supabaseKey?.length
    })
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration')
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
    console.log('Dashboard manager: Supabase client created')
    
    // Get user from JWT token
    const authHeader = req.headers.get('Authorization')
    let userId = null
    
    console.log('Dashboard manager: Auth header check', {
      hasAuthHeader: !!authHeader,
      authHeaderLength: authHeader?.length
    })
    
    if (authHeader) {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser(
          authHeader.replace('Bearer ', '')
        )
        userId = user?.id
        console.log('Dashboard manager: Auth result', {
          hasUser: !!user,
          userId: userId,
          authError: authError?.message
        })
      } catch (err) {
        console.log('Dashboard manager: Auth error:', err)
        // Continue without user for public dashboards
      }
    } else {
      console.log('Dashboard manager: No auth header, proceeding with public access')
    }

    console.log('Dashboard manager: Processing action:', action, 'with userId:', userId)

    switch (action) {
      case 'list':
        return await listDashboards(supabase, userId)
      case 'get':
        const dashboardId = url.searchParams.get('id')
        return await getDashboard(supabase, dashboardId, userId)
      case 'create':
        if (!userId) throw new Error('Authentication required for creating dashboards')
        
        console.log('Dashboard manager: Request headers:', Object.fromEntries(req.headers.entries()))
        console.log('Dashboard manager: Content-Type:', req.headers.get('content-type'))
        console.log('Dashboard manager: Content-Length:', req.headers.get('content-length'))
        
        let createData
        try {
          // Use already parsed data if available, otherwise parse fresh
          if (requestData) {
            createData = requestData
          } else {
            createData = await req.json()
          }
          console.log('Dashboard manager: Parsed create data from body:', createData)
          
          // Validate required fields
          if (!createData.name) {
            throw new Error('Dashboard name is required')
          }
        } catch (parseError) {
          console.error('Dashboard manager: JSON parse error:', parseError)
          throw new Error(`Failed to parse dashboard data: ${parseError.message}`)
        }
        return await createDashboard(supabase, createData, userId)
      case 'update':
        if (!userId) throw new Error('Authentication required for updating dashboards')
        let updateData
        try {
          // Use already parsed data if available, otherwise parse fresh
          if (requestData) {
            updateData = requestData
          } else {
            updateData = await req.json()
          }
          console.log('Dashboard manager: Parsed update data:', updateData)
        } catch (parseError) {
          console.error('Dashboard manager: JSON parse error:', parseError)
          throw new Error(`Failed to parse update data: ${parseError.message}`)
        }
        return await updateDashboard(supabase, updateData, userId)
      case 'delete':
        if (!userId) throw new Error('Authentication required for deleting dashboards')
        const deleteId = url.searchParams.get('id')
        return await deleteDashboard(supabase, deleteId, userId)
      case 'clone':
        if (!userId) throw new Error('Authentication required for cloning dashboards')
        const cloneId = url.searchParams.get('id')
        const cloneName = url.searchParams.get('name')
        return await cloneDashboard(supabase, cloneId, cloneName, userId)
      case 'share':
        if (!userId) throw new Error('Authentication required for sharing dashboards')
        let shareData
        try {
          // Use already parsed data if available, otherwise parse fresh
          if (requestData) {
            shareData = requestData
          } else {
            shareData = await req.json()
          }
          console.log('Dashboard manager: Parsed share data:', shareData)
        } catch (parseError) {
          console.error('Dashboard manager: JSON parse error:', parseError)
          throw new Error(`Failed to parse share data: ${parseError.message}`)
        }
        return await shareDashboard(supabase, shareData, userId)
      case 'create_widget':
        if (!userId) throw new Error('Authentication required for creating widgets')
        let widgetData
        try {
          // Use already parsed data if available, otherwise parse fresh
          if (requestData) {
            widgetData = requestData
          } else {
            widgetData = await req.json()
          }
          console.log('Dashboard manager: Parsed widget data:', widgetData)
        } catch (parseError) {
          console.error('Dashboard manager: JSON parse error:', parseError)
          throw new Error(`Failed to parse widget data: ${parseError.message}`)
        }
        return await createWidget(supabase, widgetData.payload, userId)
      case 'update_widget':
        if (!userId) throw new Error('Authentication required for updating widgets')
        let updateWidgetData
        try {
          // Use already parsed data if available, otherwise parse fresh
          if (requestData) {
            updateWidgetData = requestData
          } else {
            updateWidgetData = await req.json()
          }
          console.log('Dashboard manager: Parsed update widget data:', updateWidgetData)
        } catch (parseError) {
          console.error('Dashboard manager: JSON parse error:', parseError)
          throw new Error(`Failed to parse update widget data: ${parseError.message}`)
        }
        return await updateWidget(supabase, updateWidgetData.payload, userId)
      case 'delete_widget':
        if (!userId) throw new Error('Authentication required for deleting widgets')
        let deleteWidgetData
        try {
          // Use already parsed data if available, otherwise parse fresh
          if (requestData) {
            deleteWidgetData = requestData
          } else {
            deleteWidgetData = await req.json()
          }
          console.log('Dashboard manager: Parsed delete widget data:', deleteWidgetData)
        } catch (parseError) {
          console.error('Dashboard manager: JSON parse error:', parseError)
          throw new Error(`Failed to parse delete widget data: ${parseError.message}`)
        }
        return await deleteWidget(supabase, deleteWidgetData.payload, userId)
      default:
        throw new Error(`Unknown action: ${action}`)
    }

  } catch (error) {
    console.error('Dashboard manager error:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    })
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
}

// List user's dashboards
async function listDashboards(supabase: any, userId: string | null) {
  console.log('listDashboards: Starting with userId:', userId)
  
  try {
    let query = supabase
      .from('dashboards')
      .select(`
        id,
        name,
        description,
        is_public,
        status,
        created_at,
        updated_at,
        dashboard_widgets(count)
      `)

    if (userId) {
      console.log('listDashboards: Adding user filter for userId:', userId)
      query = query.or(`user_id.eq.${userId},is_public.eq.true`)
    } else {
      console.log('listDashboards: No user, showing only public dashboards')
      query = query.eq('is_public', true)
    }

    const { data: dashboards, error } = await query.order('updated_at', { ascending: false })

    console.log('listDashboards: Query result', {
      error: error?.message,
      dashboardCount: dashboards?.length,
      dashboards: dashboards
    })

    if (error) {
      console.error('listDashboards: Database error:', error)
      throw error
    }

    const response = {
      dashboards: dashboards || []
    }

    console.log('listDashboards: Returning response:', response)

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    console.error('listDashboards: Exception caught:', err)
    throw err
  }
}

// Get specific dashboard with widgets
async function getDashboard(supabase: any, dashboardId: string | null, userId: string | null) {
  if (!dashboardId) {
    throw new Error('Dashboard ID is required')
  }

  let query = supabase
    .from('dashboards')
    .select('*')
    .eq('id', dashboardId)

  if (userId) {
    // Allow access to user's dashboards and public ones
    query = query.or(`user_id.eq.${userId},is_public.eq.true`)
  } else {
    // Only public dashboards
    query = query.eq('is_public', true)
  }

  const { data: dashboard, error: dashError } = await query.single()

  if (dashError) throw dashError

  // Get widgets
  const { data: widgets, error: widgetsError } = await supabase
    .from('dashboard_widgets')
    .select('*')
    .eq('dashboard_id', dashboardId)
    .order('position_y', { ascending: true })
    .order('position_x', { ascending: true })

  if (widgetsError) throw widgetsError

  return new Response(JSON.stringify({ 
    dashboard: { ...dashboard, dashboard_widgets: widgets } 
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

// Create new dashboard
async function createDashboard(supabase: any, data: any, userId: string) {
  console.log('createDashboard: Starting with data:', data, 'userId:', userId)
  
  const { name, description, widgets = [], layout = {} } = data

  console.log('createDashboard: Extracted values:', { name, description, widgets, layout })

  try {
    // Create dashboard
    const { data: dashboard, error: dashError } = await supabase
      .from('dashboards')
      .insert({
        name,
        description,
        user_id: userId,
        layout: layout,
        settings: {}
      })
      .select()
      .single()

    console.log('createDashboard: Dashboard insert result:', { dashboard, dashError })

    if (dashError) {
      console.error('createDashboard: Dashboard insert error:', dashError)
      throw dashError
    }

    // Create widgets
    console.log('createDashboard: Creating widgets, count:', widgets.length)
    const widgetPromises = widgets.map(async (widget: any, index: number) => {
      // Only allow whitelisted fields, never include id, created_at, updated_at
      const insertObj: any = {
        dashboard_id: dashboard.id,
        title: widget.title ?? '',
        widget_type: widget.type,
        position_x: widget.position?.x || (index % 4) * 6,
        position_y: widget.position?.y || Math.floor(index / 4) * 4,
        width: widget.size?.width || 6,
        height: widget.size?.height || 4,
        config: widget.config || {},
        data_source: widget.data_source || {},
        filters: widget.filters || []
      };
      // Defensive clean for UUID fields
      cleanUUIDFields(insertObj);
      // Remove any undefined values
      Object.keys(insertObj).forEach(key => {
        if (insertObj[key] === undefined) {
          delete insertObj[key];
        }
      });
      // Explicitly remove 'id' if present
      if ('id' in insertObj) {
        delete insertObj.id;
      }
      // Validate required fields
      if (!insertObj.dashboard_id || typeof insertObj.dashboard_id !== 'string') {
        throw new Error('Widget insert error: dashboard_id is missing or invalid');
      }
      if (!insertObj.widget_type || typeof insertObj.widget_type !== 'string') {
        throw new Error('Widget insert error: widget_type is missing or invalid');
      }
      if (!insertObj.title || typeof insertObj.title !== 'string') {
        throw new Error('Widget insert error: title is missing or invalid');
      }
      if (typeof insertObj.position_x !== 'number') insertObj.position_x = 0;
      if (typeof insertObj.position_y !== 'number') insertObj.position_y = 0;
      if (typeof insertObj.width !== 'number') insertObj.width = 4;
      if (typeof insertObj.height !== 'number') insertObj.height = 1;
      if (!insertObj.config || typeof insertObj.config !== 'object') insertObj.config = { type: 'bar', showLegend: true };
      if (!insertObj.data_source || typeof insertObj.data_source !== 'object') insertObj.data_source = { table: 'servers', aggregation: 'count', groupBy: 'status', filters: [] };
      if (!Array.isArray(insertObj.filters)) insertObj.filters = [];
      console.log('Dashboard manager: Widget insert object:', insertObj);
      const { data: newWidget, error: widgetError } = await supabase
        .from('dashboard_widgets')
        .insert(insertObj)
        .select()
        .single();

      if (widgetError) {
        console.error('Dashboard manager: Widget insert error object:', widgetError);
        throw widgetError;
      }
      return newWidget;
    });

    await Promise.all(widgetPromises)
    console.log('createDashboard: All widgets created successfully')

    const response = { 
      dashboard,
      message: 'Dashboard created successfully' 
    }

    console.log('createDashboard: Returning response:', response)

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    console.error('createDashboard: Exception caught:', err)
    throw err
  }
}

// Update dashboard
async function updateDashboard(supabase: any, data: any, userId: string) {
  // Fix: support both { action, payload } and direct payload
  const payload = data.payload ?? data;
  const {
    id,
    name,
    description = '',
    layout = {},
    widgets
  } = payload;

  // Extra debug logs for dashboard update
  console.log('--- Backend Dashboard Update Debug ---');
  console.log('Dashboard ID:', id);
  console.log('User ID:', userId);
  console.log('Dashboard update payload:', { id, name, description, layout });

  try {
    // Update dashboard
    const { error: updateError } = await supabase
      .from('dashboards')
      .update({
        name,
        description,
        layout,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', userId);

    if (updateError) throw updateError;

    // Update widgets if provided
    if (widgets) {
      // Delete existing widgets
      await supabase
        .from('dashboard_widgets')
        .delete()
        .eq('dashboard_id', id);

      // Recreate widgets (simpler than complex update logic)
      const widgetPromises = widgets.map(async (widget: any, index: number) => {
        // Only allow whitelisted fields, never include id, created_at, updated_at
        const insertObj: any = {
          dashboard_id: id,
          title: widget.title ?? '',
          widget_type: widget.widget_type ?? widget.type ?? 'chart',
          position_x: widget.position_x ?? (widget.position?.x ?? (index % 4) * 6),
          position_y: widget.position_y ?? (widget.position?.y ?? Math.floor(index / 4) * 4),
          width: widget.width ?? (widget.size?.width ?? 6),
          height: widget.height ?? (widget.size?.height ?? 4),
          config: widget.config ?? {},
          data_source: widget.data_source ?? {},
          filters: widget.filters ?? []
        };
        // Defensive clean for UUID fields
        cleanUUIDFields(insertObj);
        // Remove any undefined values
        Object.keys(insertObj).forEach(key => {
          if (insertObj[key] === undefined) {
            delete insertObj[key];
          }
        });
        // Explicitly remove 'id' if present
        if ('id' in insertObj) {
          delete insertObj.id;
        }
        // Validate required fields
        if (!insertObj.dashboard_id || typeof insertObj.dashboard_id !== 'string') {
          throw new Error('Widget insert error: dashboard_id is missing or invalid');
        }
        if (!insertObj.widget_type || typeof insertObj.widget_type !== 'string') {
          throw new Error('Widget insert error: widget_type is missing or invalid');
        }
        if (!insertObj.title || typeof insertObj.title !== 'string') {
          throw new Error('Widget insert error: title is missing or invalid');
        }
        if (typeof insertObj.position_x !== 'number') insertObj.position_x = 0;
        if (typeof insertObj.position_y !== 'number') insertObj.position_y = 0;
        if (typeof insertObj.width !== 'number') insertObj.width = 4;
        if (typeof insertObj.height !== 'number') insertObj.height = 1;
        if (!insertObj.config || typeof insertObj.config !== 'object') insertObj.config = { type: 'bar', showLegend: true };
        if (!insertObj.data_source || typeof insertObj.data_source !== 'object') insertObj.data_source = { table: 'servers', aggregation: 'count', groupBy: 'status', filters: [] };
        if (!Array.isArray(insertObj.filters)) insertObj.filters = [];
        // Extra debug logs for widget insert
        console.log('--- Backend Widget Insert Debug ---');
        console.log('Widget Insert Object:', JSON.stringify(insertObj, null, 2));
        const { data: newWidget, error: widgetError } = await supabase
          .from('dashboard_widgets')
          .insert(insertObj)
          .select()
          .single();

        if (widgetError) {
          console.error('Dashboard manager: Widget insert error object:', widgetError);
          throw widgetError;
        }
        return newWidget;
      });

      await Promise.all(widgetPromises);
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Dashboard updated successfully' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('updateDashboard: Exception caught:', err);
    return new Response(JSON.stringify({
      success: false,
      error: err.message || 'Unknown error',
      details: err.stack || null
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Delete dashboard
async function deleteDashboard(supabase: any, dashboardId: string | null, userId: string) {
  if (!dashboardId) {
    throw new Error('Dashboard ID is required')
  }

  const { error } = await supabase
    .from('dashboards')
    .delete()
    .eq('id', dashboardId)
    .eq('user_id', userId)

  if (error) throw error

  return new Response(JSON.stringify({ 
    message: 'Dashboard deleted successfully' 
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

// Clone dashboard
async function cloneDashboard(supabase: any, dashboardId: string | null, newName: string | null, userId: string) {
  if (!dashboardId || !newName) {
    throw new Error('Dashboard ID and new name are required')
  }

  // Get original dashboard
  const { data: original, error: getError } = await supabase
    .from('dashboards')
    .select(`
      *,
      dashboard_widgets(
        *,
        widget_data_sources(*)
      )
    `)
    .eq('id', dashboardId)
    .single()

  if (getError) throw getError

  // Create cloned dashboard
  const cloneData = {
    name: newName,
    description: `Cloned from: ${original.name}`,
    widgets: original.dashboard_widgets || [],
    layout: original.layout || {}
  }

  return await createDashboard(supabase, cloneData, userId)
}

// Create widget for existing dashboard
async function createWidget(supabase: any, data: any, userId: string) {
  // Extra debug logs for widget creation
  console.log('--- Backend Widget Create Debug ---');
  console.log('Widget Create Data:', JSON.stringify(data, null, 2));
  console.log('User ID:', userId);
  
  const { 
    dashboard_id, 
    title, 
    widget_type, 
    position_x, 
    position_y, 
    width, 
    height, 
    config, 
    data_source, 
    filters 
  } = data

  if (!dashboard_id) {
    throw new Error('Dashboard ID is required')
  }

  try {
    // Verify dashboard exists and user has access
    const { data: dashboard, error: dashError } = await supabase
      .from('dashboards')
      .select('id, user_id')
      .eq('id', dashboard_id)
      .single()

    if (dashError) {
      console.error('createWidget: Dashboard lookup error:', dashError)
      throw new Error('Dashboard not found')
    }

    if (dashboard.user_id !== userId) {
      throw new Error('Access denied: You can only add widgets to your own dashboards')
    }

    // Create the widget
    const { data: newWidget, error: widgetError } = await supabase
      .from('dashboard_widgets')
      .insert({
        dashboard_id,
        title: title || 'New Widget',
        widget_type: widget_type || 'metric',
        position_x: position_x || 0,
        position_y: position_y || 0,
        width: width || 6,
        height: height || 4,
        config: config || {},
        data_source: data_source || {},
        filters: filters || []
      })
      .select()
      .single()

    if (widgetError) {
      console.error('createWidget: Widget insert error:', widgetError)
      throw widgetError
    }

    console.log('createWidget: Widget created successfully:', newWidget)

    return new Response(JSON.stringify({ 
      success: true,
      data: newWidget,
      message: 'Widget created successfully' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    console.error('createWidget: Exception caught:', err)
    throw err
  }
}

// Update widget for existing dashboard
async function updateWidget(supabase: any, data: any, userId: string) {
  // Extra debug logs for widget update
  console.log('--- Backend Widget Update Debug ---');
  console.log('Widget Update Data:', JSON.stringify(data, null, 2));
  console.log('User ID:', userId);
  const { id, ...rest } = data;
  if (!isValidUUID(id)) {
    throw new Error('Widget update error: id is missing or not a valid UUID');
  }
  // Check if there's actually anything to update
  const updateData: any = {};
  for (const key in rest) {
    if (rest[key] !== undefined) {
      updateData[key] = rest[key];
    }
  }
  // If no fields to update, just return the current widget
  if (Object.keys(updateData).length === 0) {
    console.log('updateWidget: No fields to update, returning current widget');
    try {
      const { data: currentWidget, error: fetchError } = await supabase
        .from('dashboard_widgets')
        .select('*')
        .eq('id', id)
        .single();
      if (fetchError) {
        console.error('updateWidget: Widget fetch error:', fetchError);
        throw new Error('Widget not found');
      }
      return new Response(JSON.stringify({ 
        success: true,
        data: currentWidget,
        message: 'Widget retrieved successfully (no updates needed)' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch (err) {
      console.error('updateWidget: Exception in fetch:', err);
      throw err;
    }
  }
  try {
    // First, get the widget and verify ownership via a simpler approach
    const { data: widget, error: widgetError } = await supabase
      .from('dashboard_widgets')
      .select(`
        id,
        dashboard_id
      `)
      .eq('id', id)
      .single()

    if (widgetError) {
      console.error('updateWidget: Widget lookup error:', widgetError)
      throw new Error('Widget not found')
    }

    // Now check dashboard ownership
    const { data: dashboard, error: dashError } = await supabase
      .from('dashboards')
      .select('id, user_id')
      .eq('id', widget.dashboard_id)
      .single()

    if (dashError) {
      console.error('updateWidget: Dashboard lookup error:', dashError)
      throw new Error('Dashboard not found')
    }

    if (dashboard.user_id !== userId) {
      throw new Error('Access denied: You can only update widgets on your own dashboards')
    }

    // Update the widget
    const { data: updatedWidget, error: updateError } = await supabase
      .from('dashboard_widgets')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('updateWidget: Widget update error:', updateError)
      throw updateError
    }

    console.log('updateWidget: Widget updated successfully:', updatedWidget)

    return new Response(JSON.stringify({ 
      success: true,
      data: updatedWidget,
      message: 'Widget updated successfully' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    console.error('updateWidget: Exception caught:', err)
    throw err
  }
}

// Delete widget
async function deleteWidget(supabase: any, data: any, userId: string) {
  console.log('deleteWidget: Starting with data:', data, 'userId:', userId)
  
  const { id } = data

  if (!id) {
    throw new Error('Widget ID is required')
  }

  try {
    // First, get the widget and verify ownership via a simpler approach
    const { data: widget, error: widgetError } = await supabase
      .from('dashboard_widgets')
      .select(`
        id,
        dashboard_id
      `)
      .eq('id', id)
      .single()

    if (widgetError) {
      console.error('deleteWidget: Widget lookup error:', widgetError)
      throw new Error('Widget not found')
    }

    // Now check dashboard ownership
    const { data: dashboard, error: dashError } = await supabase
      .from('dashboards')
      .select('id, user_id')
      .eq('id', widget.dashboard_id)
      .single()

    if (dashError) {
      console.error('deleteWidget: Dashboard lookup error:', dashError)
      throw new Error('Dashboard not found')
    }

    if (dashboard.user_id !== userId) {
      throw new Error('Access denied: You can only delete widgets from your own dashboards')
    }

    // Delete the widget
    const { error: deleteError } = await supabase
      .from('dashboard_widgets')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('deleteWidget: Widget delete error:', deleteError)
      throw deleteError
    }

    console.log('deleteWidget: Widget deleted successfully')

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Widget deleted successfully' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    console.error('deleteWidget: Exception caught:', err)
    throw err
  }
}

// Share dashboard
// Share dashboard - TODO: Implement when dashboard_shares table is added
async function shareDashboard(supabase: any, data: any, userId: string) {
  // For now, return a not implemented response
  return new Response(JSON.stringify({ 
    error: 'Dashboard sharing not yet implemented' 
  }), {
    status: 501,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

// For local testing with: deno run --allow-net --allow-env index.ts
if (typeof Deno !== 'undefined' && typeof Deno.serve === 'function') {
  Deno.serve(handler);
}
