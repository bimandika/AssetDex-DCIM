import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'DELETE, OPTIONS'
}

export const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
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

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify the JWT
    const token = authHeader.replace('Bearer ', '')
    const { data: { user: adminUser }, error: userError } = await supabaseAdmin.auth.getUser(token)
    
    if (userError || !adminUser) {
      return new Response(
        JSON.stringify({ error: 'Invalid token', details: userError?.message }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse the request body
    let requestData;
    try {
      requestData = await req.json()
    } catch (e) {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { userId } = requestData

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Prevent self-deletion
    if (adminUser.id === userId) {
      return new Response(
        JSON.stringify({ error: 'Cannot delete your own account' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    try {
      // Check if user exists in profiles table
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (profileError) {
        console.error('Error checking profiles:', profileError)
        throw profileError
      }

      // Delete from user_roles
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .delete()
        .eq('user_id', userId)

      if (roleError) {
        console.warn('Warning deleting user roles:', roleError)
      }

      // Delete from profiles
      if (profile) {
        const { error: profileDeleteError } = await supabaseAdmin
          .from('profiles')
          .delete()
          .eq('id', userId)

        if (profileDeleteError) {
          console.error('Error deleting profile:', profileDeleteError)
          throw profileDeleteError
        }
      }

      // Try to delete from auth.users
      try {
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)
        if (authError) {
          console.warn('Warning deleting from auth (might not exist):', authError)
        }
      } catch (authError) {
        console.warn('Warning in auth deletion attempt:', authError)
        // Continue even if auth deletion fails
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'User data cleaned up successfully',
          userId,
          deletedFrom: {
            profiles: !!profile,
            user_roles: true // We try to delete even if we don't know if it existed
          }
        }),
        { 
          status: 200, 
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json' 
          } 
        }
      )

    } catch (error) {
      console.error('Error in cleanup operations:', error)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to clean up user data',
          details: error.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    console.error('Error in admin-delete-user:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message,
        stack: error.stack 
      }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
}
