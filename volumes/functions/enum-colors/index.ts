import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

export const handler = async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        },
        db: {
          schema: 'public'
        }
      }
    )

    // Get the authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      console.error('Unauthorized:', userError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { method } = req
    const url = new URL(req.url)
    const action = url.searchParams.get('action')

    switch (method) {
      case 'GET':
        return await handleGet(supabaseAdmin, url)
      case 'POST':
        return await handlePost(supabaseAdmin, req, user)
      case 'PUT':
        return await handlePut(supabaseAdmin, req, user)
      case 'DELETE':
        return await handleDelete(supabaseAdmin, req)
      default:
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }
  } catch (error) {
    console.error('Error in enum-colors function:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
}

async function handleGet(supabaseClient: any, url: URL) {
  const enumType = url.searchParams.get('enum_type')
  const enumValue = url.searchParams.get('enum_value')
  
  console.log('GET request:', { enumType, enumValue });
  
  let query = supabaseClient
    .from('enum_colors')
    .select('*')
    .eq('is_active', true)
    .order('enum_type', { ascending: true })
    .order('enum_value', { ascending: true })

  if (enumType) {
    query = query.eq('enum_type', enumType)
  }
  
  if (enumValue) {
    query = query.eq('enum_value', enumValue)
  }

  const { data, error } = await query

  if (error) {
    console.error('GET query error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  console.log(`GET response: Found ${data?.length || 0} colors:`, data);
  return new Response(JSON.stringify({ data }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

async function handlePost(supabaseClient: any, req: Request, user: any) {
  const body = await req.json()
  const { enum_type, enum_value, color_hex, color_name } = body

  console.log('POST request:', { enum_type, enum_value, color_hex, color_name, user_id: user.id });

  if (!enum_type || !enum_value || !color_hex) {
    console.error('Missing required fields:', { enum_type, enum_value, color_hex });
    return new Response(JSON.stringify({ 
      error: 'Missing required fields: enum_type, enum_value, color_hex' 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  // Validate hex color format
  if (!/^#[0-9A-F]{6}$/i.test(color_hex)) {
    console.error('Invalid color format:', color_hex);
    return new Response(JSON.stringify({ 
      error: 'Invalid color_hex format. Expected #RRGGBB' 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  // Prepare upsert data
  const upsertData = {
    enum_type,
    enum_value,
    color_hex,
    color_name,
    user_id: user.id,
    created_by: user.id,
    is_active: true
  };
  
  console.log('Upserting data:', upsertData);

  // First, check if there's an existing record for this enum_type + enum_value
  const { data: existingRecords, error: findError } = await supabaseClient
    .from('enum_colors')
    .select('id, user_id')
    .eq('enum_type', enum_type)
    .eq('enum_value', enum_value)
    .eq('is_active', true);

  if (findError) {
    console.error('Error finding existing records:', findError);
    return new Response(JSON.stringify({ error: findError.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  let data, error;

  if (existingRecords && existingRecords.length > 0) {
    // Update the existing record
    const existingRecord = existingRecords[0];
    console.log('Updating existing record:', existingRecord.id);
    
    const updateResult = await supabaseClient
      .from('enum_colors')
      .update({
        color_hex,
        color_name,
        user_id: user.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', existingRecord.id)
      .select()
      .single();
    
    data = updateResult.data;
    error = updateResult.error;
  } else {
    // Create a new record
    console.log('Creating new record');
    
    const insertResult = await supabaseClient
      .from('enum_colors')
      .insert(upsertData)
      .select()
      .single();
    
    data = insertResult.data;
    error = insertResult.error;
  }

  if (error) {
    console.error('Operation error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  console.log('Successfully saved color:', data);
  return new Response(JSON.stringify({ data }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

async function handlePut(supabaseClient: any, req: Request, user: any) {
  const body = await req.json()
  const { id, color_hex, color_name } = body

  if (!id || !color_hex) {
    return new Response(JSON.stringify({ 
      error: 'Missing required fields: id, color_hex' 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  // Validate hex color format
  if (!/^#[0-9A-F]{6}$/i.test(color_hex)) {
    return new Response(JSON.stringify({ 
      error: 'Invalid color_hex format. Expected #RRGGBB' 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  const { data, error } = await supabaseClient
    .from('enum_colors')
    .update({
      color_hex,
      color_name,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  return new Response(JSON.stringify({ data }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

async function handleDelete(supabaseClient: any, req: Request) {
  const body = await req.json()
  const { id } = body

  console.log('Delete request for id:', id);

  if (!id) {
    return new Response(JSON.stringify({ error: 'Missing id parameter' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  const { data, error } = await supabaseClient
    .from('enum_colors')
    .delete()
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Delete error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  return new Response(JSON.stringify({ data }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}
