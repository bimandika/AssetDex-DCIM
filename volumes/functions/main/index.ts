import { serve } from 'https://deno.land/std@0.190.0/http/server.ts'

serve(async (req) => {
  const url = new URL(req.url)
  
  try {
    // Get enums endpoint
    if (url.pathname === '/get-enums' && req.method === 'GET') {
      const { handler } = await import('../get-enums/index.ts')
      return await handler(req)
    }

    // Admin create user endpoint
    if (url.pathname === '/admin-create-user' && req.method === 'POST') {
      const { handler } = await import('../admin-create-user/index.ts')
      return await handler(req)
    }

    // Admin delete user endpoint
    if (url.pathname === '/admin-delete-user' && req.method === 'DELETE') {
      const { handler } = await import('../admin-delete-user/index.ts')
      return await handler(req)
    }

    // Admin reset password endpoint
    if (url.pathname === '/admin-reset-password' && req.method === 'POST') {
      const { handler } = await import('../admin-reset-password/index.ts')
      return await handler(req)
    }
    
    return new Response(JSON.stringify({ error: 'Not Found' }), { 
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message,
      stack: error.stack 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
