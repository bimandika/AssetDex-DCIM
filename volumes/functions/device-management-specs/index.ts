// Device Management Specs API handler
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

const handler = async (req: Request) => {
  const url = new URL(req.url)
  const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'))

  // GET: List or get by id
  if (req.method === 'GET') {
    const id = url.searchParams.get('id')
    const device_id = url.searchParams.get('device_id')
    const offset = parseInt(url.searchParams.get('offset') || '0', 10)
    const limit = parseInt(url.searchParams.get('limit') || '50', 10)

    let query = supabase.from('device_management_specs').select('*', { count: 'exact' })
    if (id) query = query.eq('id', id)
    if (device_id) query = query.eq('device_id', device_id)
    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query
    if (error) {
      return new Response(JSON.stringify({ error }), { status: 500, headers: { 'Content-Type': 'application/json' } })
    }
    return new Response(JSON.stringify({ managementSpecs: data, totalCount: count }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }

  // POST: Create new management spec
  if (req.method === 'POST') {
    const body = await req.json()
    const { device_id, management_type, remote_console_support, power_control_support } = body
    const { error } = await supabase.from('device_management_specs').insert([
      { device_id, management_type, remote_console_support, power_control_support }
    ])
    if (error) {
      return new Response(JSON.stringify({ error }), { status: 500, headers: { 'Content-Type': 'application/json' } })
    }
    return new Response(JSON.stringify({ success: true }), { status: 201, headers: { 'Content-Type': 'application/json' } })
  }

  // PUT: Update management spec
  if (req.method === 'PUT') {
    const body = await req.json()
    const { id, ...fields } = body
    if (!id) {
      return new Response(JSON.stringify({ error: 'Missing id' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
    }
    const { error } = await supabase.from('device_management_specs').update(fields).eq('id', id)
    if (error) {
      return new Response(JSON.stringify({ error }), { status: 500, headers: { 'Content-Type': 'application/json' } })
    }
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }

  // DELETE: Remove management spec
  if (req.method === 'DELETE') {
    const id = url.searchParams.get('id')
    if (!id) {
      return new Response(JSON.stringify({ error: 'Missing id' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
    }
    const { error } = await supabase.from('device_management_specs').delete().eq('id', id)
    if (error) {
      return new Response(JSON.stringify({ error }), { status: 500, headers: { 'Content-Type': 'application/json' } })
    }
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }

  // Method not allowed
  return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } })
}
export default handler
