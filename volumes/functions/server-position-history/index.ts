

// POST /servers/move
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req: Request) {
  // Auth: check JWT
  const authHeader = req.headers.get("authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    return new Response("Unauthorized", { status: 401 });
  }
  const jwt = authHeader.slice(7);
  // Optionally: validate JWT here

  const url = new URL(req.url);

  // POST /servers/move
  if (url.pathname === "/servers/move" && req.method === "POST") {
    let body;
    try {
      body = await req.json();
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }
    const { serverId, rack, unit, dc_room, dc_floor, dc_building, dc_site, notes, changed_by } = body;
    if (!serverId) {
      return new Response("Missing serverId", { status: 400 });
    }
    const { data: server, error: fetchError } = await supabase
      .from("servers")
      .select("id, rack, unit, dc_room, dc_floor, dc_building, dc_site")
      .eq("id", serverId)
      .single();
    if (fetchError || !server) {
      return new Response("Server not found", { status: 404 });
    }
    const { error: updateError } = await supabase
      .from("servers")
      .update({
        rack,
        unit,
        dc_room,
        dc_floor,
        dc_building,
        dc_site,
        notes
      })
      .eq("id", serverId);
    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), { status: 500 });
    }
    // Explicitly log position change with changed_by
    const { error: historyError } = await supabase.from("server_position_history").insert({
      server_id: serverId,
      previous_rack: server.rack,
      previous_unit: server.unit,
      previous_room: server.dc_room,
      previous_floor: server.dc_floor,
      previous_building: server.dc_building,
      previous_site: server.dc_site,
      new_rack: rack,
      new_unit: unit,
      new_room: dc_room,
      new_floor: dc_floor,
      new_building: dc_building,
      new_site: dc_site,
      changed_by,
      notes
    });
    if (historyError) {
      return new Response(JSON.stringify({ error: historyError.message }), {
        status: 500,
        headers: { "content-type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  // Not found
  return new Response(JSON.stringify({ error: "Not Found" }), {
    status: 404,
    headers: { "content-type": "application/json" },
  });
}

// For Deno Edge Function compatibility
serve(handler);
