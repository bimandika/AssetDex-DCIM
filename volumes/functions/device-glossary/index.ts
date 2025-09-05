// Device Glossary API handler
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

const handler = async (req: Request) => {
  const url = new URL(req.url)
  const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'))

  // Handle complete-specs endpoint: /device-glossary/{id}/complete-specs
  if (url.pathname.includes('/complete-specs') && req.method === 'GET') {
    const pathParts = url.pathname.split('/')
    const deviceId = pathParts[pathParts.length - 2] // Get the ID before '/complete-specs'
    
    try {
      // Get device basic info
      const { data: device, error: deviceError } = await supabase
        .from('device_glossary')
        .select('*')
        .eq('id', deviceId)
        .single()
      
      if (deviceError) throw deviceError
      if (!device) {
        return new Response(JSON.stringify({ error: 'Device not found' }), { 
          status: 404, 
          headers: { 'Content-Type': 'application/json' } 
        })
      }
      
      // Get all specifications
      const specifications: any = {}
      
      // CPU Specs
      const { data: cpuSpecs } = await supabase
        .from('device_cpu_specs')
        .select('*')
        .eq('device_id', deviceId)
        .single()
      specifications.cpu = cpuSpecs
      
      // Memory Specs
      const { data: memorySpecs } = await supabase
        .from('device_memory_specs')
        .select('*')
        .eq('device_id', deviceId)
        .single()
      specifications.memory = memorySpecs
      
      // Storage Specs (multiple)
      const { data: storageSpecs } = await supabase
        .from('device_storage_specs')
        .select('*')
        .eq('device_id', deviceId)
        .order('storage_slot_number')
      specifications.storage = storageSpecs || []
      
      // Network Specs (multiple)
      const { data: networkSpecs } = await supabase
        .from('device_network_specs')
        .select('*')
        .eq('device_id', deviceId)
        .order('nic_slot_number')
      specifications.network = networkSpecs || []
      
      // Power Specs (multiple)
      const { data: powerSpecs } = await supabase
        .from('device_power_specs')
        .select('*')
        .eq('device_id', deviceId)
        .order('psu_slot_number')
      specifications.power = powerSpecs || []
      
      // Management Specs
      const { data: managementSpecs } = await supabase
        .from('device_management_specs')
        .select('*')
        .eq('device_id', deviceId)
        .single()
      specifications.management = managementSpecs
      
      return new Response(JSON.stringify({ 
        device, 
        specifications 
      }), { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      })
      
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      })
    }
  }

  // Handle compatibility endpoint: /device-glossary/{id}/compatibility
  if (url.pathname.includes('/compatibility') && req.method === 'GET') {
    const pathParts = url.pathname.split('/')
    const deviceId = pathParts[pathParts.length - 2] // Get the ID before '/compatibility'
    
    try {
      // Get compatibility data with device details
      const { data: compatibility, error: compatibilityError } = await supabase
        .from('device_compatibility')
        .select(`
          *,
          compatible_device:compatible_with(
            id,
            device_model,
            manufacturer,
            device_type
          )
        `)
        .eq('device_id', deviceId)
      
      if (compatibilityError) throw compatibilityError
      
      return new Response(JSON.stringify(compatibility || []), { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      })
      
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      })
    }
  }

  // Handle comparison endpoint
  if (url.pathname.includes('/compare')) {
    if (req.method === 'GET') {
      const models = url.searchParams.get('models')?.split(',').filter(Boolean) || []
      const include = url.searchParams.get('include')?.split(',') || ['cpu', 'memory', 'storage', 'network', 'power']
      
      if (models.length < 2) {
        return new Response(JSON.stringify({ error: 'At least 2 models required for comparison' }), { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        })
      }
      
      if (models.length > 5) {
        return new Response(JSON.stringify({ error: 'Maximum 5 models can be compared at once' }), { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        })
      }
      
      try {
        // Get device models
        const { data: devices, error: devicesError } = await supabase
          .from('device_glossary')
          .select('*')
          .in('id', models)
        
        if (devicesError) throw devicesError
        
        const specifications: any = { cpu: [], memory: [], storage: [], network: [], power: [], management: [] }
        
        // Get specifications for each device
        for (const device of devices) {
          if (include.includes('cpu')) {
            const { data: cpuSpecs } = await supabase
              .from('device_cpu_specs')
              .select('*')
              .eq('device_id', device.id)
              .single()
            specifications.cpu.push(cpuSpecs)
          }
          
          if (include.includes('memory')) {
            const { data: memorySpecs } = await supabase
              .from('device_memory_specs')
              .select('*')
              .eq('device_id', device.id)
              .single()
            specifications.memory.push(memorySpecs)
          }
          
          if (include.includes('storage')) {
            const { data: storageSpecs } = await supabase
              .from('device_storage_specs')
              .select('*')
              .eq('device_id', device.id)
            specifications.storage.push(storageSpecs || [])
          }
          
          if (include.includes('network')) {
            const { data: networkSpecs } = await supabase
              .from('device_network_specs')
              .select('*')
              .eq('device_id', device.id)
            specifications.network.push(networkSpecs || [])
          }
          
          if (include.includes('power')) {
            const { data: powerSpecs } = await supabase
              .from('device_power_specs')
              .select('*')
              .eq('device_id', device.id)
            specifications.power.push(powerSpecs || [])
          }
          
          if (include.includes('management')) {
            const { data: managementSpecs } = await supabase
              .from('device_management_specs')
              .select('*')
              .eq('device_id', device.id)
              .single()
            specifications.management.push(managementSpecs)
          }
        }
        
        // Generate basic comparison summary
        const differences: string[] = []
        const summary = {
          pros: [],
          cons: [],
          recommendations: []
        }
        
        // Analyze CPU differences
        if (specifications.cpu.length > 0) {
          const cpuSpecs = specifications.cpu.filter(Boolean)
          if (cpuSpecs.length > 1) {
            const cores = cpuSpecs.map(s => s.physical_cores).filter(Boolean)
            const frequencies = cpuSpecs.map(s => s.base_frequency_ghz).filter(Boolean)
            
            if (cores.length > 1 && new Set(cores).size > 1) {
              differences.push(`CPU cores vary: ${Math.min(...cores)} to ${Math.max(...cores)} cores`)
            }
            if (frequencies.length > 1 && new Set(frequencies).size > 1) {
              differences.push(`CPU frequencies vary: ${Math.min(...frequencies)} to ${Math.max(...frequencies)} GHz`)
            }
          }
        }
        
        // Analyze Memory differences
        if (specifications.memory.length > 0) {
          const memSpecs = specifications.memory.filter(Boolean)
          if (memSpecs.length > 1) {
            const capacities = memSpecs.map(s => s.total_capacity_gb).filter(Boolean)
            const types = memSpecs.map(s => s.memory_type).filter(Boolean)
            
            if (capacities.length > 1 && new Set(capacities).size > 1) {
              differences.push(`Memory capacity varies: ${Math.min(...capacities)} to ${Math.max(...capacities)} GB`)
            }
            if (types.length > 1 && new Set(types).size > 1) {
              differences.push(`Memory types: ${[...new Set(types)].join(', ')}`)
            }
          }
        }
        
        const comparisonResult = {
          models: devices,
          specifications,
          differences,
          summary
        }
        
        return new Response(JSON.stringify(comparisonResult), { 
          status: 200, 
          headers: { 'Content-Type': 'application/json' } 
        })
        
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { 
          status: 500, 
          headers: { 'Content-Type': 'application/json' } 
        })
      }
    }
  }

  // GET: List or get by id
  if (req.method === 'GET') {
    const id = url.searchParams.get('id')
    const device_type = url.searchParams.get('device_type')
    const manufacturer = url.searchParams.get('manufacturer')
    const year = url.searchParams.get('year')
    const offset = parseInt(url.searchParams.get('offset') || '0', 10)
    const limit = parseInt(url.searchParams.get('limit') || '50', 10)

    let query = supabase.from('device_glossary').select('*', { count: 'exact' })
    if (id) query = query.eq('id', id)
    if (device_type) query = query.eq('device_type', device_type)
    if (manufacturer) query = query.ilike('manufacturer', `%${manufacturer}%`)
    if (year) query = query.eq('year', year)
    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query
    if (error) {
      return new Response(JSON.stringify({ error }), { status: 500, headers: { 'Content-Type': 'application/json' } })
    }
    return new Response(JSON.stringify({ devices: data, totalCount: count }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }

  // POST: Create new device
  if (req.method === 'POST') {
    const body = await req.json()
    const { device_model, device_type, manufacturer, year, unit_height, status, description, datasheet_url, image_url } = body
    const { error } = await supabase.from('device_glossary').insert([
      { device_model, device_type, manufacturer, year, unit_height, status, description, datasheet_url, image_url }
    ])
    if (error) {
      return new Response(JSON.stringify({ error }), { status: 500, headers: { 'Content-Type': 'application/json' } })
    }
    return new Response(JSON.stringify({ success: true }), { status: 201, headers: { 'Content-Type': 'application/json' } })
  }

  // PUT: Update device
  if (req.method === 'PUT') {
    const body = await req.json()
    const { id, components, ...fields } = body
    
    if (!id) {
      return new Response(JSON.stringify({ error: 'Missing id' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
    }

    try {
      // Update basic device info (excluding component data)
      const deviceFields = Object.keys(fields).reduce((acc, key) => {
        // Only include fields that belong to device_glossary table
        if (!key.includes('_specs') && key !== 'specifications') {
          acc[key] = fields[key]
        }
        return acc
      }, {} as any)

      if (Object.keys(deviceFields).length > 0) {
        const { error: deviceError } = await supabase
          .from('device_glossary')
          .update(deviceFields)
          .eq('id', id)
        
        if (deviceError) throw deviceError
      }

      // Handle component specifications if provided
      if (components) {
        // Handle Storage Components
        if (components.storage && Array.isArray(components.storage)) {
          // First, delete existing storage specs for this device
          await supabase
            .from('device_storage_specs')
            .delete()
            .eq('device_id', id)

          // Insert new storage specs, but avoid duplicating existing specs from other devices
          for (let i = 0; i < components.storage.length; i++) {
            const storage = components.storage[i]
            
            // Check if this storage component already exists as a device spec for another device
            if (storage.id && storage.device_id && storage.device_id !== id) {
              // This is an existing device storage spec from another device - clone its properties
              const storageData = {
                device_id: id,
                storage_slot_number: i + 1,
                storage_model: storage.storage_model,
                storage_type: storage.storage_type,
                capacity_gb: storage.capacity_gb,
                interface_type: storage.interface_type,
                hot_plug_support: storage.hot_plug_support || false,
                drive_form_factor: storage.drive_form_factor,
                performance_tier: storage.performance_tier,
                warranty_years: storage.warranty_years,
                quantity: storage.quantity || 1
              }

              const { error: storageError } = await supabase
                .from('device_storage_specs')
                .insert(storageData)
              
              if (storageError) throw storageError
            } else {
              // This is a new storage specification - create it normally
              const storageData = {
                device_id: id,
                storage_slot_number: i + 1,
                storage_model: storage.model || storage.component_model || storage.storage_model,
                storage_type: storage.storage_type || storage.component_type,
                capacity_gb: storage.capacity_gb || storage.specifications?.capacity_gb,
                interface_type: storage.interface_type || storage.specifications?.interface_type,
                hot_plug_support: storage.hot_plug_support || storage.specifications?.hot_plug_support || false,
                drive_form_factor: storage.drive_form_factor || storage.specifications?.form_factor,
                performance_tier: storage.performance_tier || storage.specifications?.performance_tier,
                warranty_years: storage.warranty_years || storage.specifications?.warranty_years,
                quantity: storage.quantity || 1
              }

              const { error: storageError } = await supabase
                .from('device_storage_specs')
                .insert(storageData)
              
              if (storageError) throw storageError
            }
          }
        }

        // Handle CPU Components
        if (components.cpu && Array.isArray(components.cpu) && components.cpu.length > 0) {
          // Delete existing CPU specs
          await supabase
            .from('device_cpu_specs')
            .delete()
            .eq('device_id', id)

          // Insert new CPU specs (typically just one, but handle array)
          const cpu = components.cpu[0] // Take first CPU
          const cpuData = {
            device_id: id,
            cpu_model: cpu.model || cpu.component_model,
            cpu_generation: cpu.cpu_generation || cpu.specifications?.generation,
            physical_cores: cpu.physical_cores || cpu.specifications?.cores,
            logical_cores: cpu.logical_cores || cpu.specifications?.threads,
            cpu_quantity: cpu.cpu_quantity || cpu.quantity || 1,
            base_frequency_ghz: cpu.base_frequency_ghz || cpu.specifications?.base_frequency,
            boost_frequency_ghz: cpu.boost_frequency_ghz || cpu.specifications?.boost_frequency,
            cpu_architecture: cpu.cpu_architecture || cpu.specifications?.architecture,
            tdp_watts: cpu.tdp_watts || cpu.specifications?.tdp,
            l1_cache_kb: cpu.l1_cache_kb || cpu.specifications?.l1_cache,
            l2_cache_mb: cpu.l2_cache_mb || cpu.specifications?.l2_cache,
            l3_cache_mb: cpu.l3_cache_mb || cpu.specifications?.l3_cache,
            instruction_sets: cpu.instruction_sets || cpu.specifications?.instruction_sets
          }

          const { error: cpuError } = await supabase
            .from('device_cpu_specs')
            .insert(cpuData)
          
          if (cpuError) throw cpuError
        }

        // Handle Memory Components
        if (components.memory && Array.isArray(components.memory) && components.memory.length > 0) {
          // Delete existing memory specs
          await supabase
            .from('device_memory_specs')
            .delete()
            .eq('device_id', id)

          const memory = components.memory[0] // Take first memory config
          const memoryData = {
            device_id: id,
            total_capacity_gb: memory.total_capacity_gb || memory.specifications?.capacity,
            memory_type: memory.memory_type || memory.specifications?.type,
            memory_frequency_mhz: memory.memory_frequency_mhz || memory.specifications?.frequency,
            module_count: memory.module_count || memory.specifications?.module_count,
            module_capacity_gb: memory.module_capacity_gb || memory.specifications?.module_capacity,
            ecc_support: memory.ecc_support || memory.specifications?.ecc_support || false,
            maximum_capacity_gb: memory.maximum_capacity_gb || memory.specifications?.max_capacity,
            memory_channels: memory.memory_channels || memory.specifications?.channels
          }

          const { error: memoryError } = await supabase
            .from('device_memory_specs')
            .insert(memoryData)
          
          if (memoryError) throw memoryError
        }

        // Handle Network Components
        if (components.network && Array.isArray(components.network)) {
          // Delete existing network specs
          await supabase
            .from('device_network_specs')
            .delete()
            .eq('device_id', id)

          for (let i = 0; i < components.network.length; i++) {
            const network = components.network[i]
            const networkData = {
              device_id: id,
              nic_slot_number: i + 1,
              nic_type: network.nic_type || network.specifications?.type,
              nic_manufacturer: network.nic_manufacturer || network.manufacturer,
              nic_model: network.model || network.component_model,
              port_type: network.port_type || network.specifications?.port_type,
              port_speed_gbps: network.port_speed_gbps || network.specifications?.speed,
              port_quantity: network.port_quantity || network.specifications?.ports || 1,
              connector_type: network.connector_type || network.specifications?.connector,
              is_management_port: network.is_management_port || network.specifications?.management || false,
              supported_modules: network.supported_modules || network.specifications?.modules,
              driver_support: network.driver_support || network.specifications?.drivers
            }

            const { error: networkError } = await supabase
              .from('device_network_specs')
              .insert(networkData)
            
            if (networkError) throw networkError
          }
        }

        // Handle Power Components  
        if (components.power && Array.isArray(components.power)) {
          // Delete existing power specs
          await supabase
            .from('device_power_specs')
            .delete()
            .eq('device_id', id)

          for (let i = 0; i < components.power.length; i++) {
            const power = components.power[i]
            const powerData = {
              device_id: id,
              psu_slot_number: i + 1,
              max_power_watts: power.max_power_watts || power.specifications?.wattage,
              power_cable_type: power.power_cable_type || power.specifications?.cable_type
            }

            const { error: powerError } = await supabase
              .from('device_power_specs')
              .insert(powerData)
            
            if (powerError) throw powerError
          }
        }
      }

      return new Response(JSON.stringify({ success: true }), { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      })

    } catch (error) {
      console.error('Device update error:', error)
      return new Response(JSON.stringify({ 
        error: error.message || 'Failed to update device' 
      }), { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      })
    }
  }

  // DELETE: Remove device
  if (req.method === 'DELETE') {
    const id = url.searchParams.get('id')
    if (!id) {
      return new Response(JSON.stringify({ error: 'Missing id' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
    }
    const { error } = await supabase.from('device_glossary').delete().eq('id', id)
    if (error) {
      return new Response(JSON.stringify({ error }), { status: 500, headers: { 'Content-Type': 'application/json' } })
    }
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }

  // Method not allowed
  return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } })
}

export default handler
