import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'PATCH, OPTIONS'
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

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user: adminUser }, error: userError } = await supabaseAdmin.auth.getUser(token)
    
    if (userError || !adminUser) {
      return new Response(
        JSON.stringify({ error: 'Invalid token', details: userError?.message }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { userId, updates } = await req.json()

    if (!userId || !updates) {
      return new Response(
        JSON.stringify({ error: 'User ID and updates are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (updates.role && adminUser.id === userId) {
      return new Response(
        JSON.stringify({ error: 'Cannot update your own role' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Prepare update data
    const updateData: any = {}
    if (updates.email) updateData.email = updates.email
    if (updates.password) updateData.password = updates.password
    if (updates.fullName) {
      updateData.user_metadata = { full_name: updates.fullName }
    }

    // Update user in auth if there are auth updates
    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        updateData
      )

      if (updateError) {
        return new Response(
          JSON.stringify({ error: 'Failed to update user', details: updateError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Update role if provided
    if (updates.role) {
      // First, check if the user already has a role
      const { data: existingRole, error: roleFetchError } = await supabaseAdmin
        .from('user_roles')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (roleFetchError && !roleFetchError.details?.includes('0 rows')) {
        return new Response(
          JSON.stringify({ 
            error: 'Failed to check user role', 
            details: roleFetchError.message 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (existingRole) {
        // Update existing role
        const { error: updateRoleError } = await supabaseAdmin
          .from('user_roles')
          .update({ role: updates.role })
          .eq('user_id', userId)

        if (updateRoleError) {
          return new Response(
            JSON.stringify({ 
              error: 'Failed to update user role', 
              details: updateRoleError.message 
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      } else {
        // Insert new role
        const { error: insertRoleError } = await supabaseAdmin
          .from('user_roles')
          .insert([{ user_id: userId, role: updates.role }])

        if (insertRoleError) {
          return new Response(
            JSON.stringify({ 
              error: 'Failed to set user role', 
              details: insertRoleError.message 
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }
    }

    // Get updated user data
    const { data: updatedUser, error: fetchUserError } = await supabaseAdmin.auth.admin.getUserById(userId)
    if (fetchUserError) {
      console.error('Error fetching updated user:', fetchUserError)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'User updated successfully',
        user: {
          id: updatedUser?.user?.id,
          email: updatedUser?.user?.email,
          fullName: updatedUser?.user?.user_metadata?.full_name,
          role: updates.role || 'No role updated'
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
    console.error('Error in admin-update-user:', error)
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
