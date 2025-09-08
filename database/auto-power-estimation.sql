-- AUTO POWER ESTIMATION FROM PSU CAPACITY
-- This system automatically estimates power consumption based on PSU wattage

-- ====================================================================
-- ENHANCED PSU-BASED POWER ESTIMATION
-- ====================================================================

-- Function to estimate power specs from PSU capacity
CREATE OR REPLACE FUNCTION estimate_power_from_psu(
    psu_watts INTEGER,
    device_type_param public.device_type DEFAULT 'Server',
    form_factor_param VARCHAR(10) DEFAULT '2U'
)
RETURNS TABLE (
    estimated_max_power_watts INTEGER,
    estimated_typical_power_watts INTEGER,
    estimated_idle_power_watts INTEGER,
    recommended_cable_type VARCHAR(10),
    efficiency_rating VARCHAR(10)
) AS $$
BEGIN
    -- Server power estimation logic
    IF device_type_param = 'Server' THEN
        RETURN QUERY SELECT
            -- Max power: 70-85% of PSU capacity (servers rarely use full PSU)
            CASE 
                WHEN psu_watts <= 300 THEN (psu_watts * 0.85)::INTEGER
                WHEN psu_watts <= 500 THEN (psu_watts * 0.80)::INTEGER
                WHEN psu_watts <= 750 THEN (psu_watts * 0.75)::INTEGER
                ELSE (psu_watts * 0.70)::INTEGER
            END as estimated_max_power_watts,
            
            -- Typical power: 40-60% of PSU capacity (normal workload)
            CASE 
                WHEN psu_watts <= 300 THEN (psu_watts * 0.50)::INTEGER
                WHEN psu_watts <= 500 THEN (psu_watts * 0.45)::INTEGER
                WHEN psu_watts <= 750 THEN (psu_watts * 0.40)::INTEGER
                ELSE (psu_watts * 0.35)::INTEGER
            END as estimated_typical_power_watts,
            
            -- Idle power: 15-25% of PSU capacity (minimal load)
            CASE 
                WHEN psu_watts <= 300 THEN (psu_watts * 0.25)::INTEGER
                WHEN psu_watts <= 500 THEN (psu_watts * 0.22)::INTEGER
                WHEN psu_watts <= 750 THEN (psu_watts * 0.20)::INTEGER
                ELSE (psu_watts * 0.18)::INTEGER
            END as estimated_idle_power_watts,
            
            -- Cable type based on power draw
            CASE 
                WHEN psu_watts <= 400 THEN 'C13'::VARCHAR(10)
                ELSE 'C19'::VARCHAR(10)
            END as recommended_cable_type,
            
            -- Efficiency rating estimate
            CASE 
                WHEN psu_watts >= 750 THEN '80+ Gold'::VARCHAR(10)
                WHEN psu_watts >= 500 THEN '80+ Bronze'::VARCHAR(10)
                ELSE 'Standard'::VARCHAR(10)
            END as efficiency_rating;
    
    -- Storage device estimation
    ELSIF device_type_param = 'Storage' THEN
        RETURN QUERY SELECT
            -- Storage typically uses more consistent power
            CASE 
                WHEN psu_watts <= 300 THEN (psu_watts * 0.80)::INTEGER
                WHEN psu_watts <= 500 THEN (psu_watts * 0.75)::INTEGER
                ELSE (psu_watts * 0.70)::INTEGER
            END as estimated_max_power_watts,
            
            -- Typical power higher for storage (spinning disks)
            CASE 
                WHEN psu_watts <= 300 THEN (psu_watts * 0.65)::INTEGER
                WHEN psu_watts <= 500 THEN (psu_watts * 0.60)::INTEGER
                ELSE (psu_watts * 0.55)::INTEGER
            END as estimated_typical_power_watts,
            
            -- Idle power still significant due to disk spinning
            CASE 
                WHEN psu_watts <= 300 THEN (psu_watts * 0.45)::INTEGER
                WHEN psu_watts <= 500 THEN (psu_watts * 0.40)::INTEGER
                ELSE (psu_watts * 0.35)::INTEGER
            END as estimated_idle_power_watts,
            
            CASE 
                WHEN psu_watts <= 400 THEN 'C13'::VARCHAR(10)
                ELSE 'C19'::VARCHAR(10)
            END as recommended_cable_type,
            
            '80+ Bronze'::VARCHAR(10) as efficiency_rating;
    
    -- Network equipment estimation
    ELSIF device_type_param = 'Network' THEN
        RETURN QUERY SELECT
            -- Network equipment typically lower power
            (psu_watts * 0.90)::INTEGER as estimated_max_power_watts,
            (psu_watts * 0.70)::INTEGER as estimated_typical_power_watts,
            (psu_watts * 0.60)::INTEGER as estimated_idle_power_watts,
            'C13'::VARCHAR(10) as recommended_cable_type,
            'Standard'::VARCHAR(10) as efficiency_rating;
    
    ELSE
        -- Default/Other device estimation
        RETURN QUERY SELECT
            (psu_watts * 0.75)::INTEGER as estimated_max_power_watts,
            (psu_watts * 0.50)::INTEGER as estimated_typical_power_watts,
            (psu_watts * 0.25)::INTEGER as estimated_idle_power_watts,
            CASE 
                WHEN psu_watts <= 400 THEN 'C13'::VARCHAR(10)
                ELSE 'C19'::VARCHAR(10)
            END as recommended_cable_type,
            'Standard'::VARCHAR(10) as efficiency_rating;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- AUTO POWER ESTIMATION FROM DEVICE GLOSSARY AND PSU CAPACITY
-- This system automatically estimates power consumption and integrates with device glossary

-- ====================================================================
-- ENHANCED DEVICE GLOSSARY INTEGRATION WITH PSU-BASED ESTIMATION
-- ====================================================================

-- Function to update device glossary with PSU-based power estimates
CREATE OR REPLACE FUNCTION update_device_glossary_power(
    device_glossary_id UUID,
    psu_watts INTEGER,
    device_type_param public.device_type DEFAULT 'Server'
)
RETURNS TEXT AS $$
DECLARE
    power_estimates RECORD;
    existing_component_id UUID;
    result_text TEXT;
BEGIN
    -- Generate power estimates
    SELECT * INTO power_estimates
    FROM estimate_power_from_psu(psu_watts, device_type_param);
    
    -- Check if power component already exists
    SELECT id INTO existing_component_id
    FROM device_components 
    WHERE device_id = device_glossary_id 
    AND component_type = 'power'
    LIMIT 1;
    
    IF existing_component_id IS NOT NULL THEN
        -- Update existing power component
        UPDATE device_components 
        SET specifications = jsonb_build_object(
            'psu_wattage', psu_watts,
            'power_consumption_idle', power_estimates.estimated_idle_power_watts,
            'power_consumption_max', power_estimates.estimated_max_power_watts,
            'typical_power_watts', power_estimates.estimated_typical_power_watts,
            'psu_efficiency', power_estimates.efficiency_rating,
            'recommended_cable_type', power_estimates.recommended_cable_type,
            'updated_at', NOW()
        ),
        updated_at = NOW()
        WHERE id = existing_component_id;
        
        result_text := format('Updated power component with PSU %sW estimates', psu_watts);
    ELSE
        -- Insert new power component
        INSERT INTO device_components (
            device_id, 
            component_type, 
            name, 
            manufacturer, 
            model, 
            specifications,
            created_at,
            updated_at
        ) VALUES (
            device_glossary_id,
            'power',
            format('PSU %sW', psu_watts),
            'Generic',
            format('%sW PSU', psu_watts),
            jsonb_build_object(
                'psu_wattage', psu_watts,
                'power_consumption_idle', power_estimates.estimated_idle_power_watts,
                'power_consumption_max', power_estimates.estimated_max_power_watts,
                'typical_power_watts', power_estimates.estimated_typical_power_watts,
                'psu_efficiency', power_estimates.efficiency_rating,
                'recommended_cable_type', power_estimates.recommended_cable_type,
                'created_at', NOW()
            ),
            NOW(),
            NOW()
        );
        
        result_text := format('Created power component with PSU %sW estimates', psu_watts);
    END IF;
    
    RETURN result_text;
END;
$$ LANGUAGE plpgsql;

-- Function to bulk update device glossary with common PSU sizes
CREATE OR REPLACE FUNCTION populate_device_glossary_power_estimates()
RETURNS TABLE (result_summary TEXT, devices_processed INTEGER) AS $$
DECLARE
    device_count INTEGER := 0;
    device_rec RECORD;
    estimated_psu INTEGER;
BEGIN
    -- Process devices in glossary without power components
    FOR device_rec IN 
        SELECT dg.id, dg.device_model, dg.manufacturer, dg.device_type
        FROM device_glossary dg
        LEFT JOIN device_components dc ON dc.device_id = dg.id AND dc.component_type = 'power'
        WHERE dc.id IS NULL 
        AND dg.device_type IN ('Server', 'Storage', 'Network')
    LOOP
        -- Estimate PSU capacity based on device type/model
        estimated_psu := 
            CASE 
                WHEN device_rec.device_model ILIKE '%R750%' OR device_rec.device_model ILIKE '%DL380%' THEN 650
                WHEN device_rec.device_model ILIKE '%R740%' OR device_rec.device_model ILIKE '%DL360%' THEN 500
                WHEN device_rec.device_type = 'Storage' THEN 750
                WHEN device_rec.device_type = 'Network' THEN 200
                ELSE 450  -- Default for unknown servers
            END;
            
        PERFORM update_device_glossary_power(device_rec.id, estimated_psu, device_rec.device_type);
        device_count := device_count + 1;
    END LOOP;
    
    RETURN QUERY SELECT 
        format('Processed %s device glossary entries with PSU-based power estimation', device_count) as result_summary,
        device_count as devices_processed;
END;
$$ LANGUAGE plpgsql;

-- Function to get PSU wattage recommendations based on server specs
CREATE OR REPLACE FUNCTION recommend_psu_size(
    server_brand public.brand_type,
    server_model public.model_type,
    device_type_param public.device_type,
    cpu_count INTEGER DEFAULT 2,
    ram_gb INTEGER DEFAULT 32,
    disk_count INTEGER DEFAULT 2
)
RETURNS TABLE (
    recommended_psu_watts INTEGER,
    minimum_psu_watts INTEGER,
    reasoning TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        CASE 
            -- High-end servers
            WHEN server_model ILIKE '%R750%' OR server_model ILIKE '%DL380%' THEN
                GREATEST(600, (cpu_count * 150) + (ram_gb * 2) + (disk_count * 25))::INTEGER
            -- Mid-range servers  
            WHEN server_model ILIKE '%R740%' OR server_model ILIKE '%DL360%' THEN
                GREATEST(500, (cpu_count * 120) + (ram_gb * 2) + (disk_count * 20))::INTEGER
            -- Storage servers
            WHEN device_type_param = 'Storage' THEN
                GREATEST(750, (disk_count * 35) + (cpu_count * 100) + (ram_gb * 2))::INTEGER
            -- Network equipment
            WHEN device_type_param = 'Network' THEN
                LEAST(300, GREATEST(150, (cpu_count * 50) + 100))::INTEGER
            -- Default calculation
            ELSE
                GREATEST(400, (cpu_count * 100) + (ram_gb * 2) + (disk_count * 15))::INTEGER
        END as recommended_psu_watts,
        
        CASE 
            WHEN device_type_param = 'Storage' THEN 450::INTEGER
            WHEN device_type_param = 'Network' THEN 150::INTEGER
            ELSE 300::INTEGER
        END as minimum_psu_watts,
        
        format(
            'Based on %s CPUs, %sGB RAM, %s disks. Includes 25%% headroom for efficiency and future expansion.',
            cpu_count, ram_gb, disk_count
        ) as reasoning;
END;
$$ LANGUAGE plpgsql;

-- Batch function to estimate power for all servers with PSU info but no power specs
CREATE OR REPLACE FUNCTION populate_power_from_psu_data()
RETURNS TABLE (result_summary TEXT, servers_processed INTEGER) AS $$
DECLARE
    server_count INTEGER := 0;
    server_rec RECORD;
    default_psu_watts INTEGER;
BEGIN
    -- Process servers without power specs
    FOR server_rec IN 
        SELECT s.id, s.hostname, s.device_type, s.brand, s.model
        FROM public.servers s
        LEFT JOIN server_power_specs sps ON sps.server_id = s.id
        WHERE sps.server_id IS NULL
    LOOP
        -- Estimate PSU capacity based on server type/model if not provided
        default_psu_watts := 
            CASE 
                WHEN server_rec.model ILIKE '%R750%' OR server_rec.model ILIKE '%DL380%' THEN 650
                WHEN server_rec.model ILIKE '%R740%' OR server_rec.model ILIKE '%DL360%' THEN 500
                WHEN server_rec.device_type = 'Storage' THEN 750
                WHEN server_rec.device_type = 'Network' THEN 200
                ELSE 450  -- Default for unknown servers
            END;
            
        PERFORM assign_power_from_psu(server_rec.id, default_psu_watts, server_rec.device_type);
        server_count := server_count + 1;
    END LOOP;
    
    RETURN QUERY SELECT 
        format('Processed %s servers with PSU-based power estimation', server_count) as result_summary,
        server_count as servers_processed;
END;
$$ LANGUAGE plpgsql;

-- View to show power efficiency analysis
CREATE OR REPLACE VIEW power_efficiency_analysis AS
SELECT 
    s.hostname,
    s.brand,
    s.model,
    s.device_type,
    sps.max_power_watts,
    sps.typical_power_watts,
    sps.idle_power_watts,
    sps.power_cable_type,
    -- Calculate efficiency ratios
    ROUND((sps.typical_power_watts::DECIMAL / sps.max_power_watts * 100), 1) as typical_to_max_ratio,
    ROUND((sps.idle_power_watts::DECIMAL / sps.max_power_watts * 100), 1) as idle_to_max_ratio,
    ROUND(((sps.max_power_watts - sps.idle_power_watts)::DECIMAL / sps.max_power_watts * 100), 1) as dynamic_range_percent,
    -- Power density (watts per rack unit, assuming 2U default)
    ROUND(sps.max_power_watts::DECIMAL / 2, 1) as watts_per_ru,
    -- Estimated PSU capacity (reverse calculate)
    CASE 
        WHEN s.device_type = 'Server' THEN ROUND(sps.max_power_watts::DECIMAL / 0.75)::INTEGER
        WHEN s.device_type = 'Storage' THEN ROUND(sps.max_power_watts::DECIMAL / 0.70)::INTEGER
        ELSE ROUND(sps.max_power_watts::DECIMAL / 0.75)::INTEGER
    END as estimated_psu_watts
FROM servers s
JOIN server_power_specs sps ON sps.server_id = s.id
ORDER BY sps.max_power_watts DESC;

