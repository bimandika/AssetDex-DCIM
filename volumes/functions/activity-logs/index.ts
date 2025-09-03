// Activity Logs API handler
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

export async function handler(req: Request) {
  const url = new URL(req.url)
  const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'))

  if (req.method === 'POST') {
    // Insert new activity log entry
    const body = await req.json()
    // Map body fields to activity_logs columns
    const { user_id, session_id, ip_address, user_agent, category, action, resource_type, resource_id, details, metadata, request_method, request_url, request_body, response_status, response_time_ms, severity, tags, correlation_id } = body
    const { error } = await supabase.from('activity_logs').insert([
      {
        user_id,
        session_id,
        ip_address,
        user_agent,
        category,
        action,
        resource_type,
        resource_id,
        details,
        metadata,
        request_method,
        request_url,
        request_body,
        response_status,
        response_time_ms,
        severity,
        tags,
        correlation_id
      }
    ])
    if (error) {
      return new Response(JSON.stringify({ error }), { status: 500, headers: { 'Content-Type': 'application/json' } })
    }
    return new Response(JSON.stringify({ success: true }), { status: 201, headers: { 'Content-Type': 'application/json' } })
  }

  // Parse query params for filters, pagination
  const user_id = url.searchParams.get('user_id')
  const offset = parseInt(url.searchParams.get('offset') || '0', 10)
  const limit = parseInt(url.searchParams.get('limit') || '50', 10)

  // Get paginated logs
  const { data, error } = await supabase.rpc('get_activity_logs', {
    p_user_id: user_id,
    p_offset: offset,
    p_limit: limit
  })

  // Get total count (without limit/offset)
  let count = 0;
  const countQuery = supabase.from('activity_logs').select('*', { count: 'exact', head: true });
  if (user_id) countQuery.eq('user_id', user_id);
  const { count: total, error: countError } = await countQuery;
  if (typeof total === 'number') count = total;

  if (error || countError) {
    return new Response(JSON.stringify({ error: error || countError }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
  return new Response(JSON.stringify({ logs: data, totalCount: count }), { status: 200, headers: { 'Content-Type': 'application/json' } })
}
