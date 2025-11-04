import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

export const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    if (req.method === 'GET') {
      // Get app setting
      const url = new URL(req.url)
      const settingKey = url.searchParams.get('key')
      
      if (!settingKey) {
        return new Response(
          JSON.stringify({ error: 'Setting key is required' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      const { data, error } = await supabase
        .from('app_settings')
        .select('setting_value')
        .eq('setting_key', settingKey)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = not found
        console.error('Error fetching setting:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to fetch setting', details: error.message }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          value: data?.setting_value || null
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )

    } else if (req.method === 'POST') {
      // Set app setting
      const { key, value, description } = await req.json()
      
      if (!key || value === undefined) {
        return new Response(
          JSON.stringify({ error: 'Setting key and value are required' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Use upsert to insert or update
      const { data, error } = await supabase
        .from('app_settings')
        .upsert({ 
          setting_key: key, 
          setting_value: value,
          description: description || null,
          setting_type: 'string'
        }, {
          onConflict: 'setting_key'
        })
        .select()

      if (error) {
        console.error('Error setting value:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to save setting', details: error.message }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Setting saved successfully',
          data: data
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )

    } else {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

  } catch (error) {
    console.error('Error in app-settings function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}