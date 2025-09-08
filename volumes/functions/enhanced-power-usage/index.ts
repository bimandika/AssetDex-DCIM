// Enhanced Power Usage API with Dynamic Load Calculations
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS'
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
)

export const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') || 'global'
    const rack = searchParams.get('rack')
    const server_id = searchParams.get('server_id')

    // 1. Individual Server Power Details
    if (server_id) {
      const { data, error } = await supabase.rpc('get_server_power_details', {
        server_id_param: server_id
      })

      if (error) {
        console.error('Server power details error:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to get server power details' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify(data?.[0] || {}),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Enhanced Rack Power Summary (with dynamic calculations)
    if (rack) {
      const { data, error } = await supabase.rpc('get_rack_power_summary_dynamic', {
        rack_name_param: rack
      })

      if (error) {
        console.error('Enhanced rack power error:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to get enhanced rack power summary' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify(data?.[0] || {}),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Enhanced Global Power Summary (with dynamic calculations)
    if (type === 'global' || type === 'enhanced') {
      const { data, error } = await supabase.rpc('get_global_power_summary_dynamic')

      if (error) {
        console.error('Enhanced global power error:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to get enhanced global power summary' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const result = data?.[0] || {}
      
      // Add additional calculated metrics
      const enhancedResult = {
        ...result,
        power_efficiency_percent: result.max_potential_watts > 0 ? 
          ((result.current_usage_watts / result.max_potential_watts) * 100).toFixed(2) : 0,
        headroom_percent: result.total_capacity_watts > 0 ? 
          (((result.total_capacity_watts - result.current_usage_watts) / result.total_capacity_watts) * 100).toFixed(2) : 0,
        cost_per_hour_estimate: (result.current_usage_watts * 0.001 * 0.12).toFixed(2), // $0.12/kWh estimate
        carbon_footprint_kg_per_hour: (result.current_usage_watts * 0.001 * 0.42).toFixed(3), // 0.42 kg CO2/kWh
        recommendations: generatePowerRecommendations(result)
      }

      return new Response(
        JSON.stringify(enhancedResult),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. Power Trend Analysis (simulated over time)
    if (type === 'trends') {
      const trends = await generatePowerTrends()
      return new Response(
        JSON.stringify(trends),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 5. Power Comparison (current vs max vs idle)
    if (type === 'comparison') {
      const { data, error } = await supabase.rpc('get_global_power_summary_dynamic')
      if (error) throw error

      const comparison = {
        current_usage: data[0]?.current_usage_watts || 0,
        maximum_potential: data[0]?.max_potential_watts || 0,
        idle_baseline: data[0]?.idle_baseline_watts || 0,
        capacity_limit: data[0]?.total_capacity_watts || 0,
        efficiency_score: data[0]?.current_usage_watts && data[0]?.max_potential_watts ? 
          ((data[0].current_usage_watts / data[0].max_potential_watts) * 100).toFixed(1) : 0,
        utilization_categories: {
          efficient: `< 30% (${(data[0]?.idle_baseline_watts || 0)} - ${Math.round((data[0]?.max_potential_watts || 0) * 0.3)}W)`,
          balanced: `30-60% (${Math.round((data[0]?.max_potential_watts || 0) * 0.3)} - ${Math.round((data[0]?.max_potential_watts || 0) * 0.6)}W)`,
          intensive: `60-80% (${Math.round((data[0]?.max_potential_watts || 0) * 0.6)} - ${Math.round((data[0]?.max_potential_watts || 0) * 0.8)}W)`,
          maximum: `> 80% (${Math.round((data[0]?.max_potential_watts || 0) * 0.8)}W+)`
        }
      }

      return new Response(
        JSON.stringify(comparison),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Invalid request type' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Enhanced power API error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

// Helper function to generate power recommendations
function generatePowerRecommendations(powerData: any): string[] {
  const recommendations = []
  const usagePercent = parseFloat(powerData.usage_percent || 0)
  const loadEfficiency = parseFloat(powerData.load_efficiency || 0)

  if (usagePercent > 85) {
    recommendations.push("🚨 Critical: Power usage above 85%. Consider adding capacity or load balancing.")
  } else if (usagePercent > 70) {
    recommendations.push("⚠️ Warning: Power usage above 70%. Monitor closely and plan capacity expansion.")
  }

  if (loadEfficiency < 40) {
    recommendations.push("💡 Efficiency: Server load below 40%. Consider consolidating workloads or powering down unused servers.")
  }

  if (powerData.servers_offline > 0) {
    recommendations.push(`🔌 Optimization: ${powerData.servers_offline} servers offline. Review if they can be decommissioned to save power.`)
  }

  const potentialSavings = (powerData.max_potential_watts - powerData.current_usage_watts) * 0.001 * 0.12 * 24 * 30
  if (potentialSavings > 1000) {
    recommendations.push(`💰 Cost Savings: Potential monthly savings of $${potentialSavings.toFixed(0)} through optimization.`)
  }

  if (recommendations.length === 0) {
    recommendations.push("✅ Good: Power usage is within optimal range.")
  }

  return recommendations
}

// Helper function to generate simulated power trends
async function generatePowerTrends() {
  const now = new Date()
  const trends = []

  // Generate 24 hours of simulated data
  for (let i = 23; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - (i * 60 * 60 * 1000))
    const hour = timestamp.getHours()
    
    // Simulate daily power patterns (higher during business hours)
    let baseFactor = 0.6
    if (hour >= 8 && hour <= 18) {
      baseFactor = 0.8 + (Math.random() * 0.15) // Business hours
    } else if (hour >= 6 && hour <= 22) {
      baseFactor = 0.7 + (Math.random() * 0.1)  // Extended hours
    } else {
      baseFactor = 0.5 + (Math.random() * 0.15) // Night/early morning
    }

    trends.push({
      timestamp: timestamp.toISOString(),
      hour: hour,
      current_usage_watts: Math.round(120000 * baseFactor), // Base ~120kW
      usage_percent: (baseFactor * 100 / 1.2).toFixed(1), // Against capacity
      load_efficiency: ((baseFactor * 100) / 0.85).toFixed(1), // Against max potential
      status: baseFactor > 0.8 ? 'warning' : baseFactor > 0.9 ? 'critical' : 'normal'
    })
  }

  return {
    period: '24_hours',
    data_points: trends.length,
    trends: trends,
    summary: {
      avg_usage: Math.round(trends.reduce((sum, t) => sum + t.current_usage_watts, 0) / trends.length),
      peak_usage: Math.max(...trends.map(t => t.current_usage_watts)),
      min_usage: Math.min(...trends.map(t => t.current_usage_watts)),
      peak_hour: trends.find(t => t.current_usage_watts === Math.max(...trends.map(t => t.current_usage_watts)))?.hour
    }
  }
}

// Default export for Deno
Deno.serve(handler)
