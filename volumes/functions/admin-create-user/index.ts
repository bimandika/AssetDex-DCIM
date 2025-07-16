import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
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

    // Parse the request body
    const { email, password, fullName, role } = await req.json()

    // Validate input
    if (!email || !password || !fullName || !role) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate role
    const allowedRoles = ['super_admin', 'engineer', 'viewer']
    if (!allowedRoles.includes(role)) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid role', 
          details: `Role must be one of: ${allowedRoles.join(', ')}` 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user already exists in auth.users
    const { data: existingAuthUser, error: listUsersError } = await supabaseAdmin.auth.admin.listUsers()
    if (listUsersError) {
      throw new Error(`Failed to list users: ${listUsersError.message}`)
    }

    const existingUser = existingAuthUser.users.find(user => user.email === email)
    if (existingUser) {
      // Check if profile exists
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('id', existingUser.id)
        .maybeSingle()

      if (existingProfile) {
        return new Response(
          JSON.stringify({ 
            error: 'User already exists',
            details: 'User with this email already has a profile'
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // If we get here, user exists in auth but not in profiles - clean up
      console.log(`Cleaning up orphaned auth user: ${existingUser.id}`)
      await supabaseAdmin.auth.admin.deleteUser(existingUser.id)
    }

    // Create the user in auth.users
    const { data: authUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName }
    })

    if (createError || !authUser.user) {
      throw new Error(createError?.message || 'Failed to create user in auth')
    }

    const userId = authUser.user.id
    const username = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '_').substring(0, 50)

    // First, create the profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert(
        { 
          id: userId,
          username: username,
          full_name: fullName
        },
        { onConflict: 'id' }
      )

    if (profileError) {
      throw new Error(`Failed to create profile: ${profileError.message}`)
    }

    // First, delete any existing roles for this user
    const { error: deleteRolesError } = await supabaseAdmin
      .from('user_roles')
      .delete()
      .eq('user_id', userId)

    if (deleteRolesError) {
      throw new Error(`Failed to clear existing roles: ${deleteRolesError.message}`)
    }

    // Then insert the new role
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: userId,
        role: role
      })

    if (roleError) {
      throw new Error(`Failed to assign role: ${roleError.message}`)
    }

    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'User created successfully',
        user: {
          id: userId,
          email: email,
          full_name: fullName,
          username: username,
          role: role
        }
      }),
      { 
        status: 201, 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('Error in admin-create-user:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to create user',
        details: error.message
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
