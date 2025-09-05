// Device Memory Specs API handler
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

    let query = supabase.from('device_memory_specs').select('*', { count: 'exact' })
    if (id) query = query.eq('id', id)
    if (device_id) query = query.eq('device_id', device_id)
    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query
    if (error) {
      return new Response(JSON.stringify({ error }), { status: 500, headers: { 'Content-Type': 'application/json' } })
    }
    return new Response(JSON.stringify({ memorySpecs: data, totalCount: count }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }

  // POST: Create new memory spec
  if (req.method === 'POST') {
    const body = await req.json()
    const { device_id, total_capacity_gb, memory_type, memory_frequency_mhz, module_count, module_capacity_gb, ecc_support, maximum_capacity_gb, memory_channels } = body
    const { error } = await supabase.from('device_memory_specs').insert([
      { device_id, total_capacity_gb, memory_type, memory_frequency_mhz, module_count, module_capacity_gb, ecc_support, maximum_capacity_gb, memory_channels }
    ])
    if (error) {
      return new Response(JSON.stringify({ error }), { status: 500, headers: { 'Content-Type': 'application/json' } })
    }
    return new Response(JSON.stringify({ success: true }), { status: 201, headers: { 'Content-Type': 'application/json' } })
  }

  // PUT: Update memory spec
  if (req.method === 'PUT') {
    const body = await req.json()
    const { id, ...fields } = body
    if (!id) {
      return new Response(JSON.stringify({ error: 'Missing id' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
    }
    const { error } = await supabase.from('device_memory_specs').update(fields).eq('id', id)
    if (error) {
      return new Response(JSON.stringify({ error }), { status: 500, headers: { 'Content-Type': 'application/json' } })
    }
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }

  // DELETE: Remove memory spec
  if (req.method === 'DELETE') {
    const id = url.searchParams.get('id')
    if (!id) {
      return new Response(JSON.stringify({ error: 'Missing id' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
    }
    const { error } = await supabase.from('device_memory_specs').delete().eq('id', id)
    if (error) {
      return new Response(JSON.stringify({ error }), { status: 500, headers: { 'Content-Type': 'application/json' } })
    }
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }

  // Method not allowed
  return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } })
}
export default handler
