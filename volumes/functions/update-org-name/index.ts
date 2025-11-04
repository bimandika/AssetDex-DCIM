import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { name } = await req.json()
    
    if (!name || typeof name !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Organization name is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Read current .env file
    const envPath = '/opt/project/.env'
    let envContent: string
    
    try {
      envContent = await Deno.readTextFile(envPath)
    } catch (error) {
      console.error('Error reading .env file:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to read environment file' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Update or add VITE_ORGANIZATION_NAME
    const orgNameRegex = /^VITE_ORGANIZATION_NAME=.*$/m
    const newOrgNameLine = `VITE_ORGANIZATION_NAME=${name}`
    
    let updatedContent: string
    if (orgNameRegex.test(envContent)) {
      // Replace existing line
      updatedContent = envContent.replace(orgNameRegex, newOrgNameLine)
    } else {
      // Add new line in the organization section
      const insertAfter = /^# Organization Configuration$/m
      if (insertAfter.test(envContent)) {
        updatedContent = envContent.replace(
          insertAfter, 
          `# Organization Configuration\n${newOrgNameLine}`
        )
      } else {
        // Add at the end
        updatedContent = envContent + `\n\n# Organization Configuration\n${newOrgNameLine}\n`
      }
    }

    // Write updated content back to .env file
    try {
      await Deno.writeTextFile(envPath, updatedContent)
    } catch (error) {
      console.error('Error writing .env file:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to update environment file' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Organization name updated successfully in .env file',
        name: name
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error updating organization name:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})