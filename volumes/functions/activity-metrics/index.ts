// Activity Metrics API handler
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

export async function handler(req: Request) {
  const url = new URL(req.url)
  const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'))

  // Parse query params for filters
  const date_from = url.searchParams.get('date_from')
  const user_id = url.searchParams.get('user_id')

  // Call the SQL function via RPC
  const { data, error } = await supabase.rpc('get_activity_metrics', {
    p_date_from: date_from,
    p_user_id: user_id
  })

  if (error) {
    return new Response(JSON.stringify({ error }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
  return new Response(JSON.stringify({ metrics: data }), { status: 200, headers: { 'Content-Type': 'application/json' } })
}
