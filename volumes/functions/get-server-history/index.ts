

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const supabase = createClient(supabaseUrl, supabaseKey);

export async function handler(req: Request): Promise<Response> {
  // Auth: extract user ID from JWT
  const authHeader = req.headers.get("authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }
  const jwt = authHeader.slice(7);
  // Optionally: validate JWT here

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
  }
  const { serverId } = body;
  if (!serverId) {
    return new Response(JSON.stringify({ error: "Missing serverId" }), { status: 400 });
  }

  // Query position history for the server
  const { data, error } = await supabase
    .from("server_position_history")
    .select("*")
    .eq("server_id", serverId)
    .order("changed_at", { ascending: false });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ history: data }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
