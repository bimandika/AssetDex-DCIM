-- Datacenter Server Inventory - Complete Database Setup
-- This file contains all necessary tables, functions, policies, and initial data
-- for the Datacenter Server Inventory application

-- ============================================================================
-- 0. SCHEMA CREATION
-- ============================================================================

-- Ensure public schema exists
CREATE SCHEMA IF NOT EXISTS public;

-- ============================================================================
-- 1. ENUMS AND TYPES
-- ============================================================================

-- User roles for role-based access control
CREATE TYPE public.user_role AS ENUM ('super_admin', 'engineer', 'viewer');

-- Server device types
CREATE TYPE public.device_type AS ENUM ('Server', 'Storage', 'Network');

-- Server allocation types
CREATE TYPE public.allocation_type AS ENUM ('IAAS', 'PAAS', 'SAAS', 'Load Balancer', 'Database');

-- Environment types
CREATE TYPE public.environment_type AS ENUM ('Production', 'Testing', 'Pre-Production', 'Development');

-- Server status types
CREATE TYPE public.server_status AS ENUM ('Active', 'Ready' ,'Inactive', 'Maintenance', 'Decommissioned', 'Retired');

-- Rack types
CREATE TYPE public.rack_type AS ENUM (
  'RACK-01', 'RACK-02', 'RACK-03', 'RACK-04', 'RACK-05',
  'RACK-06', 'RACK-07', 'RACK-08', 'RACK-09', 'RACK-10',
  'RACK-11', 'RACK-12', 'RACK-15', 'RACK-20', 'RACK-25',
  'RACK-30', 'RACK-31'
);

-- Unit position types
CREATE TYPE public.unit_type AS ENUM (
  'U1', 'U2', 'U3', 'U4', 'U5', 'U6', 'U7', 'U8', 'U9', 'U10',
  'U11', 'U12', 'U13', 'U14', 'U15', 'U16', 'U17', 'U18', 'U19', 'U20',
  'U21', 'U22', 'U23', 'U24', 'U25', 'U26', 'U27', 'U28', 'U29', 'U30',
  'U31', 'U32', 'U33', 'U34', 'U35', 'U36', 'U37', 'U38', 'U39', 'U40',
  'U41', 'U42'
);

-- Brand types
CREATE TYPE public.brand_type AS ENUM ('Dell', 'HPE', 'Cisco', 'Juniper', 'NetApp', 'Huawei', 'Inspur', 'Kaytus', 'ZTE','Meta Brain');

-- Model types
CREATE TYPE public.model_type AS ENUM (
  'PowerEdge R740', 'PowerEdge R750', 'PowerEdge R750xd', 'PowerVault ME4', 
  'ProLiant DL380', 'ProLiant DL360', 'Apollo 4510', 'ASA 5525-X', 
  'Nexus 93180YC-EX', 'MX204', 'AFF A400', 'Other'
);

-- Operating System types
CREATE TYPE public.os_type AS ENUM (
  'Ubuntu 22.04 LTS', 'Ubuntu 20.04 LTS', 'RHEL 8', 'CentOS 7', 
  'Oracle Linux 8', 'Windows Server 2022', 'Windows Server 2019',
  'Storage OS 2.1', 'Cisco ASA 9.16', 'NX-OS 9.3', 'JunOS 21.2',
  'ONTAP 9.10', 'Other'
);

-- Data Center Site types
CREATE TYPE public.site_type AS ENUM ('DC-East', 'DC-West', 'DC-North', 'DC-South', 'DC-Central','DC1','DC2','DC3','DC4','DC5');

-- Building types
CREATE TYPE public.building_type AS ENUM ('Building-A', 'Building-B', 'Building-C', 'Building-D', 'Building-E', 'Other');

-- ============================================================================
-- 2. TABLES
-- ============================================================================

-- User profiles table (extends auth.users)
CREATE TABLE public.profiles (
    id UUID NOT NULL PRIMARY KEY,
    username TEXT NOT NULL,
    full_name TEXT,
    status BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User roles table
CREATE TABLE public.user_roles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    role public.user_role NOT NULL DEFAULT 'viewer'::public.user_role,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, role)
);

-- Property definitions for dynamic server properties
CREATE TABLE public.property_definitions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    key TEXT NOT NULL,
    name TEXT NOT NULL,
    display_name TEXT NOT NULL,
    property_type TEXT NOT NULL,
    description TEXT,
    category TEXT,
    required BOOLEAN DEFAULT false,
    default_value TEXT,
    options JSONB,
    active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(name),
    UNIQUE(key)
);

COMMENT ON COLUMN public.property_definitions.created_by IS 'ID of the user who created this property definition';
COMMENT ON COLUMN public.property_definitions.updated_by IS 'ID of the user who last updated this property definition';

-- Servers table
CREATE TABLE public.servers (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    serial_number TEXT,
    hostname TEXT NOT NULL,
    brand public.brand_type,
    model public.model_type,
    ip_address TEXT,
    ip_oob TEXT,
    operating_system public.os_type,
    dc_site public.site_type NOT NULL,
    dc_building public.building_type,
    dc_floor TEXT,
    dc_room TEXT,
    allocation public.allocation_type,
    status public.server_status DEFAULT 'Active'::public.server_status,
    device_type public.device_type NOT NULL,
    rack public.rack_type,
    unit public.unit_type,
    unit_height INTEGER DEFAULT 1 CHECK (unit_height >= 1 AND unit_height <= 10),
    warranty DATE,
    notes TEXT,
    environment public.environment_type,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT valid_warranty CHECK (warranty IS NULL OR warranty >= CURRENT_DATE)
);

-- Rack metadata table for additional rack information (RackView enhancement)
CREATE TABLE IF NOT EXISTS public.rack_metadata (
    rack_name public.rack_type PRIMARY KEY,
    datacenter_id public.site_type NOT NULL,
    floor INTEGER,
    location TEXT,
    total_units INTEGER DEFAULT 42,
    power_capacity_watts INTEGER,
    cooling_capacity_btu INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==================================================
-- FILTER PREFERENCES SYSTEM
-- ==================================================

-- User-specific filter preferences table
CREATE TABLE IF NOT EXISTS public.user_filter_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    filter_key TEXT NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT false,
    preference_type TEXT NOT NULL DEFAULT 'user', -- 'user', 'auto', 'admin'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, filter_key)
);

-- Global filter defaults (admin-controlled)
CREATE TABLE IF NOT EXISTS public.global_filter_defaults (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filter_key TEXT NOT NULL UNIQUE,
    is_enabled_by_default BOOLEAN NOT NULL DEFAULT false,
    auto_enable_rule JSONB, -- JSON rules for auto-enabling
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Filter preference audit log
CREATE TABLE IF NOT EXISTS public.filter_preference_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    filter_key TEXT NOT NULL,
    action TEXT NOT NULL, -- 'enabled', 'disabled', 'auto_detected'
    previous_state BOOLEAN,
    new_state BOOLEAN,
    triggered_by TEXT, -- 'user', 'auto_detection', 'admin'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_filter_preferences_user_id ON public.user_filter_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_filter_preferences_filter_key ON public.user_filter_preferences(filter_key);
CREATE INDEX IF NOT EXISTS idx_filter_preference_history_user_id ON public.filter_preference_history(user_id);
CREATE INDEX IF NOT EXISTS idx_global_filter_defaults_filter_key ON public.global_filter_defaults(filter_key);

-- Indexes for rack metadata and servers performance
CREATE INDEX IF NOT EXISTS idx_servers_rack ON public.servers(rack);
CREATE INDEX IF NOT EXISTS idx_servers_unit ON public.servers(unit);

-- Enable RLS (Row Level Security)
ALTER TABLE public.user_filter_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_filter_defaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.filter_preference_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_filter_preferences
CREATE POLICY "Users can view their own filter preferences" ON public.user_filter_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own filter preferences" ON public.user_filter_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own filter preferences" ON public.user_filter_preferences
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own filter preferences" ON public.user_filter_preferences
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for global_filter_defaults
CREATE POLICY "Anyone can read global filter defaults" ON public.global_filter_defaults
    FOR SELECT USING (true);

CREATE POLICY "Only admins can manage global filter defaults" ON public.global_filter_defaults
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur 
            WHERE ur.user_id = auth.uid() 
            AND ur.role = 'super_admin'
        )
    );

-- RLS Policies for filter_preference_history
CREATE POLICY "Users can view their own filter history" ON public.filter_preference_history
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert filter history" ON public.filter_preference_history
    FOR INSERT WITH CHECK (true);

-- Function to get user filter preferences with global defaults
CREATE OR REPLACE FUNCTION public.get_user_filter_preferences(p_user_id UUID DEFAULT auth.uid())
RETURNS TABLE (
    filter_key TEXT,
    is_enabled BOOLEAN,
    preference_type TEXT,
    is_global_default BOOLEAN,
    global_default_enabled BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(ufp.filter_key, gfd.filter_key) as filter_key,
        COALESCE(ufp.is_enabled, gfd.is_enabled_by_default, false) as is_enabled,
        COALESCE(ufp.preference_type, 'default') as preference_type,
        (gfd.filter_key IS NOT NULL) as is_global_default,
        COALESCE(gfd.is_enabled_by_default, false) as global_default_enabled
    FROM public.global_filter_defaults gfd
    FULL OUTER JOIN public.user_filter_preferences ufp 
        ON gfd.filter_key = ufp.filter_key AND ufp.user_id = p_user_id
    ORDER BY filter_key;
END;
$$;

-- Function to update user filter preference
CREATE OR REPLACE FUNCTION public.update_user_filter_preference(
    p_user_id UUID,
    p_filter_key TEXT,
    p_is_enabled BOOLEAN,
    p_preference_type TEXT DEFAULT 'user'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    previous_state BOOLEAN;
BEGIN
    -- Check if user can update (must be own preference)
    IF p_user_id != auth.uid() THEN
        RAISE EXCEPTION 'Access denied: Can only update own preferences';
    END IF;

    -- Get previous state for audit log
    SELECT is_enabled INTO previous_state 
    FROM public.user_filter_preferences 
    WHERE user_id = p_user_id AND filter_key = p_filter_key;

    -- Insert or update preference
    INSERT INTO public.user_filter_preferences (user_id, filter_key, is_enabled, preference_type)
    VALUES (p_user_id, p_filter_key, p_is_enabled, p_preference_type)
    ON CONFLICT (user_id, filter_key) 
    DO UPDATE SET 
        is_enabled = p_is_enabled,
        preference_type = p_preference_type,
        updated_at = now();

    -- Log the change
    INSERT INTO public.filter_preference_history (
        user_id, filter_key, action, previous_state, new_state, triggered_by
    ) VALUES (
        p_user_id, 
        p_filter_key, 
        CASE WHEN p_is_enabled THEN 'enabled' ELSE 'disabled' END,
        previous_state,
        p_is_enabled,
        'user'
    );

    RETURN true;
END;
$$;

-- Function to auto-enable filters based on smart rules
CREATE OR REPLACE FUNCTION public.auto_enable_filters_for_user(
    p_user_id UUID,
    p_detected_filters JSONB
)
RETURNS TABLE (
    detected_filter_key TEXT,
    auto_enabled BOOLEAN,
    reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    filter_record RECORD;
    filter_item TEXT;
    should_enable BOOLEAN;
    enable_reason TEXT;
BEGIN
    -- Check if user can update (must be own preference)
    IF p_user_id != auth.uid() THEN
        RAISE EXCEPTION 'Access denied: Can only update own preferences';
    END IF;

    -- Validate that p_detected_filters is a valid JSON array
    IF p_detected_filters IS NULL OR jsonb_typeof(p_detected_filters) != 'array' THEN
        RAISE EXCEPTION 'p_detected_filters must be a valid JSON array';
    END IF;

    -- Process each detected filter
    FOR filter_item IN SELECT jsonb_array_elements_text(p_detected_filters)
    LOOP
        should_enable := false;
        enable_reason := '';

        -- Check if filter already has user preference
        IF EXISTS (SELECT 1 FROM public.user_filter_preferences ufp
                  WHERE ufp.user_id = p_user_id AND ufp.filter_key = filter_item) THEN
            -- User already has preference, don't auto-enable
            CONTINUE;
        END IF;

        -- Check global default
        SELECT gfd.is_enabled_by_default INTO should_enable
        FROM public.global_filter_defaults gfd
        WHERE gfd.filter_key = filter_item;

        IF should_enable THEN
            enable_reason := 'global_default';
        ELSE
            -- Apply smart auto-enable rules
            -- Rule 1: Important keywords
            IF filter_item ~ '(priority|status|type|category|level|tier)' THEN
                should_enable := true;
                enable_reason := 'important_keyword';
            END IF;

            -- Rule 2: Check if it's a reasonable enum with property definitions
            IF NOT should_enable THEN
                SELECT COUNT(*) <= 20 INTO should_enable
                FROM public.property_definitions pd
                WHERE pd.key = filter_item 
                AND pd.property_type IN ('enum', 'select')
                AND jsonb_array_length(COALESCE(pd.options, '[]'::jsonb)) BETWEEN 2 AND 20;
                
                IF should_enable THEN
                    enable_reason := 'reasonable_enum';
                END IF;
            END IF;
        END IF;

        -- Auto-enable if criteria met
        IF should_enable THEN
            INSERT INTO public.user_filter_preferences (user_id, filter_key, is_enabled, preference_type)
            VALUES (p_user_id, filter_item, true, 'auto')
            ON CONFLICT (user_id, filter_key) DO NOTHING;

            -- Log the auto-enable
            INSERT INTO public.filter_preference_history (
                user_id, filter_key, action, previous_state, new_state, triggered_by
            ) VALUES (
                p_user_id, filter_item, 'auto_detected', false, true, 'auto_detection'
            );
        END IF;

        -- Return result
        RETURN QUERY SELECT filter_item, should_enable, enable_reason;
    END LOOP;
END;
$$;

-- Function to get global filter defaults
CREATE OR REPLACE FUNCTION public.get_global_filter_defaults()
RETURNS TABLE (
    filter_key TEXT,
    is_enabled_by_default BOOLEAN,
    auto_enable_rule JSONB,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        gfd.filter_key,
        gfd.is_enabled_by_default,
        gfd.auto_enable_rule,
        gfd.created_at
    FROM public.global_filter_defaults gfd
    ORDER BY gfd.filter_key;
END;
$$;

-- Function to sync newly detected enum columns with filter preferences
CREATE OR REPLACE FUNCTION public.sync_enum_columns_to_filter_defaults()
RETURNS TABLE (
    filter_key TEXT,
    action TEXT,
    reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    enum_column RECORD;
    should_be_default BOOLEAN;
    default_reason TEXT;
BEGIN
    -- Get all enum columns from property definitions
    FOR enum_column IN 
        SELECT pd.key, pd.display_name, pd.options, pd.property_type
        FROM public.property_definitions pd
        WHERE pd.property_type IN ('enum', 'select') 
        AND pd.active = true
    LOOP
        should_be_default := false;
        default_reason := '';

        -- Skip if already exists in global defaults
        IF EXISTS (SELECT 1 FROM public.global_filter_defaults gfd
                  WHERE gfd.filter_key = enum_column.key) THEN
            CONTINUE;
        END IF;

        -- Apply smart rules for global defaults
        -- Rule 1: Important keywords should be enabled by default
        IF enum_column.key ~ '(priority|status|type|category|level|tier)' THEN
            should_be_default := true;
            default_reason := 'important_keyword';
        -- Rule 2: Reasonable number of options (2-10 options = auto-enable)
        ELSIF jsonb_array_length(COALESCE(enum_column.options, '[]'::jsonb)) BETWEEN 2 AND 10 THEN
            should_be_default := true;
            default_reason := 'reasonable_options';
        END IF;

        -- Insert global default
        INSERT INTO public.global_filter_defaults (
            filter_key, 
            is_enabled_by_default, 
            auto_enable_rule,
            created_by
        ) VALUES (
            enum_column.key,
            should_be_default,
            jsonb_build_object(
                'reason', default_reason,
                'option_count', jsonb_array_length(COALESCE(enum_column.options, '[]'::jsonb)),
                'display_name', enum_column.display_name
            ),
            auth.uid()
        );

        RETURN QUERY SELECT 
            enum_column.key, 
            CASE WHEN should_be_default THEN 'auto_enabled' ELSE 'available' END,
            default_reason;
    END LOOP;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_user_filter_preferences(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_filter_preference(UUID, TEXT, BOOLEAN, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auto_enable_filters_for_user(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_global_filter_defaults() TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_enum_columns_to_filter_defaults() TO authenticated;

-- Trigger to automatically sync enum columns when property definitions change
CREATE OR REPLACE FUNCTION public.trigger_sync_enum_filter_defaults()
RETURNS TRIGGER AS $$
BEGIN
    -- Only sync if it's an enum/select type
    IF (TG_OP = 'INSERT' AND NEW.property_type IN ('enum', 'select')) OR
       (TG_OP = 'UPDATE' AND NEW.property_type IN ('enum', 'select') AND 
        (OLD.property_type != NEW.property_type OR OLD.options != NEW.options)) THEN
        
        PERFORM public.sync_enum_columns_to_filter_defaults();
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_property_definitions_sync_filters
    AFTER INSERT OR UPDATE ON public.property_definitions
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_sync_enum_filter_defaults();

-- Comments for documentation
COMMENT ON TABLE public.user_filter_preferences IS 'Stores individual user preferences for which filters to show in ServerInventory';
COMMENT ON TABLE public.global_filter_defaults IS 'Admin-controlled defaults for filter visibility across the organization';
COMMENT ON TABLE public.filter_preference_history IS 'Audit log of all filter preference changes';

COMMENT ON FUNCTION public.get_user_filter_preferences(UUID) IS 'Gets user filter preferences merged with global defaults';
COMMENT ON FUNCTION public.update_user_filter_preference(UUID, TEXT, BOOLEAN, TEXT) IS 'Updates a user filter preference with audit logging';
COMMENT ON FUNCTION public.auto_enable_filters_for_user(UUID, JSONB) IS 'Auto-enables filters based on smart rules for newly detected enum columns';
COMMENT ON FUNCTION public.sync_enum_columns_to_filter_defaults() IS 'Syncs newly detected enum columns to global filter defaults';

-- ============================================================================
-- 3. SAMPLE DATA
-- ============================================================================
-- Insert 25 sample server records with valid enum values
INSERT INTO public.servers (
  id, serial_number, hostname, brand, model, ip_address, ip_oob, operating_system,
  dc_site, dc_building, dc_floor, dc_room,
  allocation, environment, status, device_type, rack, unit, unit_height, warranty, notes, created_by, created_at, updated_at
) VALUES
-- Production Web Servers (1-3)
(gen_random_uuid(), 'SN2023W001', 'web-prod-01', 'Dell', 'PowerEdge R740', '192.168.1.10', '10.0.0.1', 'Ubuntu 22.04 LTS',
 'DC-East', 'Building-A', '1', '101',
 'IAAS', 'Production', 'Active', 'Server', 'RACK-01', 'U42', 1, '2025-12-31', 'Primary web server',
 (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), now(), now()),

(gen_random_uuid(), 'SN2023W002', 'web-prod-02', 'Dell', 'PowerEdge R740', '192.168.1.11', '10.0.0.2', 'Ubuntu 22.04 LTS',
 'DC-East', 'Building-A', '1', '101',
 'IAAS', 'Production', 'Active', 'Server', 'RACK-01', 'U40', 1, '2025-12-31', 'Secondary web server',
 (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), now(), now()),

(gen_random_uuid(), 'SN2023W003', 'web-prod-03', 'Dell', 'PowerEdge R750', '192.168.1.12', '10.0.0.3', 'Ubuntu 22.04 LTS',
 'DC-East', 'Building-A', '1', '101',
 'IAAS', 'Production', 'Active', 'Server', 'RACK-01', 'U37', 2, '2025-12-31', 'Tertiary web server',
 (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), now(), now()),

-- Database Servers (4-6)
(gen_random_uuid(), 'SN2023D001', 'db-primary-01', 'HPE', 'ProLiant DL380', '192.168.2.10', '10.0.0.4', 'Oracle Linux 8',
 'DC-East', 'Building-A', '1', '102',
 'Database', 'Production', 'Active', 'Server', 'RACK-01', 'U34', 2, '2026-06-30', 'Primary database server',
 (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), now(), now()),

(gen_random_uuid(), 'SN2023D002', 'db-replica-01', 'HPE', 'ProLiant DL380', '192.168.2.11', '10.0.0.5', 'Oracle Linux 8',
 'DC-East', 'Building-A', '1', '102',
 'Database', 'Production', 'Active', 'Server', 'RACK-01', 'U31', 2, '2026-06-30', 'Database replica 1',
 (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), now(), now()),

(gen_random_uuid(), 'SN2023D003', 'db-backup-01', 'Dell', 'PowerEdge R750', '192.168.2.12', '10.0.0.6', 'RHEL 8',
 'DC-East', 'Building-A', '1', '201',
 'Database', 'Production', 'Active', 'Server', 'RACK-02', 'U26', 2, '2026-06-30', 'Backup database server',
 (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), now(), now()),

-- Storage (7-9)
(gen_random_uuid(), 'SN2023S001', 'storage-01', 'Dell', 'PowerVault ME4', '192.168.3.10', '10.0.0.7', 'Storage OS 2.1',
 'DC-East', 'Building-A', '2', '201',
 'PAAS', 'Production', 'Active', 'Storage', 'RACK-02', 'U38', 4, '2026-09-30', 'Primary storage array',
 (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), now(), now()),

(gen_random_uuid(), 'SN2023S002', 'nas-archive-01', 'NetApp', 'AFF A400', '192.168.3.11', '10.0.0.8', 'ONTAP 9.10',
 'DC-East', 'Building-A', '1', '301',
 'PAAS', 'Production', 'Active', 'Storage', 'RACK-02', 'U34', 3, '2027-03-31', 'High-performance NAS',
 (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), now(), now()),

(gen_random_uuid(), 'SN2023S003', 'backup-stor-01', 'Dell', 'PowerVault ME4', '192.168.3.12', '10.0.0.9', 'Storage OS 2.1',
 'DC-East', 'Building-A', '1', '401',
 'PAAS', 'Production', 'Active', 'Storage', 'RACK-02', 'U29', 4, '2026-12-31', 'Backup storage array',
 (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), now(), now()),

-- Network Devices (10-12)
(gen_random_uuid(), 'SN2023N001', 'core-sw-01', 'Cisco', 'Nexus 93180YC-EX', '192.168.4.10', '10.0.0.10', 'NX-OS 9.3',
 'DC-East', 'Building-A', '1', 'MDF',
 'IAAS', 'Production', 'Active', 'Network', 'RACK-01', 'U1', 1, '2026-09-30', 'Core switch 1',
 (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), now(), now()),

(gen_random_uuid(), 'SN2023N002', 'fw-01', 'Cisco', 'ASA 5525-X', '192.168.4.11', '10.0.0.11', 'Cisco ASA 9.16',
 'DC-East', 'Building-A', '1', 'MDF',
 'Load Balancer', 'Production', 'Active', 'Network', 'RACK-01', 'U2', 1, '2027-01-31', 'Main firewall',
 (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), now(), now()),

(gen_random_uuid(), 'SN2023N003', 'edge-rtr-01', 'Juniper', 'MX204', '192.168.4.12', '10.0.0.12', 'JunOS 21.2',
 'DC-East', 'Building-A', '1', 'MDF',
 'IAAS', 'Production', 'Active', 'Network', 'RACK-01', 'U3', 1, '2027-01-31', 'Edge router',
 (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), now(), now()),

-- Development Servers (13-15)
(gen_random_uuid(), 'SN2023D004', 'dev-app-01', 'Dell', 'PowerEdge R750', '192.168.5.10', '10.0.1.1', 'Ubuntu 22.04 LTS',
 'DC-East', 'Building-A', '3', '301',
 'IAAS', 'Development', 'Active', 'Server', 'RACK-03', 'U22', 2, '2025-12-31', 'Development app server',
 (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), now(), now()),

(gen_random_uuid(), 'SN2023D005', 'dev-db-01', 'Dell', 'PowerEdge R740', '192.168.5.11', '10.0.1.2', 'Oracle Linux 8',
 'DC-East', 'Building-A', '3', '302',
 'Database', 'Development', 'Active', 'Server', 'RACK-03', 'U19', 2, '2025-12-31', 'Development database',
 (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), now(), now()),

(gen_random_uuid(), 'SN2023D006', 'dev-web-01', 'HPE', 'ProLiant DL360', '192.168.5.12', '10.0.1.3', 'Ubuntu 22.04 LTS',
 'DC-East', 'Building-A', '3', '303',
 'IAAS', 'Development', 'Active', 'Server', 'RACK-03', 'U17', 1, '2025-12-31', 'Development web server',
 (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), now(), now()),

-- Testing Environment (16-18)
(gen_random_uuid(), 'SN2023T001', 'test-db-01', 'HPE', 'ProLiant DL360', '192.168.6.10', '10.0.2.1', 'Oracle Linux 8',
 'DC-East', 'Building-A', '1', '105',
 'Database', 'Testing', 'Active', 'Server', 'RACK-03', 'U31', 1, '2026-06-30', 'Test database server',
 (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), now(), now()),

(gen_random_uuid(), 'SN2023T002', 'test-app-01', 'Dell', 'PowerEdge R740', '192.168.6.11', '10.0.2.2', 'Ubuntu 20.04 LTS',
 'DC-East', 'Building-A', '1', '105',
 'IAAS', 'Testing', 'Active', 'Server', 'RACK-03', 'U28', 2, '2026-06-30', 'Test application server',
 (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), now(), now()),

(gen_random_uuid(), 'SN2023T003', 'test-web-01', 'HPE', 'ProLiant DL380', '192.168.6.12', '10.0.2.3', 'Ubuntu 20.04 LTS',
 'DC-East', 'Building-A', '1', '105',
 'IAAS', 'Testing', 'Active', 'Server', 'RACK-03', 'U25', 2, '2026-06-30', 'Test web server',
 (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), now(), now()),

-- Staging Environment (19-21)
(gen_random_uuid(), 'SN2023S004', 'stage-web-01', 'Dell', 'PowerEdge R740', '192.168.7.10', '10.0.3.1', 'Ubuntu 20.04 LTS',
 'DC-East', 'Building-A', '2', '205',
 'IAAS', 'Pre-Production', 'Active', 'Server', 'RACK-03', 'U40', 2, '2025-12-31', 'Staging web server',
 (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), now(), now()),

(gen_random_uuid(), 'SN2023S005', 'stage-db-01', 'Dell', 'PowerEdge R740', '192.168.7.11', '10.0.3.2', 'RHEL 8',
 'DC-East', 'Building-A', '2', '206',
 'Database', 'Pre-Production', 'Active', 'Server', 'RACK-03', 'U37', 2, '2026-12-31', 'Staging database',
 (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), now(), now()),

(gen_random_uuid(), 'SN2023S006', 'stage-app-01', 'HPE', 'ProLiant DL380', '192.168.7.12', '10.0.3.3', 'RHEL 8',
 'DC-East', 'Building-A', '2', '207',
 'IAAS', 'Pre-Production', 'Active', 'Server', 'RACK-03', 'U34', 2, '2026-12-31', 'Staging application server',
 (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), now(), now()),

-- Additional Servers (22-25)
(gen_random_uuid(), 'SN2023A001', 'monitor-01', 'Dell', 'PowerEdge R750', '192.168.8.10', '10.0.4.1', 'Ubuntu 22.04 LTS',
 'DC-East', 'Building-A', '2', '201',
 'IAAS', 'Production', 'Active', 'Server', 'RACK-01', 'U28', 2, '2026-12-31', 'Monitoring server',
 (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), now(), now()),

(gen_random_uuid(), 'SN2023A002', 'backup-01', 'HPE', 'ProLiant DL380', '192.168.8.11', '10.0.4.2', 'Ubuntu 22.04 LTS',
 'DC-East', 'Building-A', '1', '202',
 'IAAS', 'Production', 'Active', 'Server', 'RACK-02', 'U23', 2, '2026-12-31', 'Backup server',
 (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), now(), now()),

(gen_random_uuid(), 'SN2023A003', 'auth-01', 'Dell', 'PowerEdge R740', '192.168.8.12', '10.0.4.3', 'Ubuntu 22.04 LTS',
 'DC-East', 'Building-A', '2', '202',
 'IAAS', 'Production', 'Active', 'Server', 'RACK-01', 'U25', 2, '2026-12-31', 'Authentication server',
 (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), now(), now()),

(gen_random_uuid(), 'SN2023A004', 'log-01', 'HPE', 'ProLiant DL360', '192.168.8.13', '10.0.4.4', 'Ubuntu 22.04 LTS',
 'DC-East', 'Building-A', '1', '203',
 'IAAS', 'Production', 'Active', 'Server', 'RACK-02', 'U21', 1, '2026-12-31', 'Logging server',
 (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), now(), now());

-- Insert rack metadata for 3-rack consolidation
INSERT INTO public.rack_metadata (rack_name, datacenter_id, floor, location) VALUES
('RACK-01', 'DC-East', 1, 'Row A'),  -- Production & Network
('RACK-02', 'DC-East', 1, 'Row A'),  -- Storage & Backup  
('RACK-03', 'DC-East', 1, 'Row B');  -- Development & Testing

-- ============================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servers ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. FUNCTIONS
-- ============================================================================

-- Function to check if a user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.user_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, status)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data ->> 'username', new.email),
    COALESCE(new.raw_user_meta_data ->> 'full_name', ''),
    true
  );
  
  -- Assign default viewer role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'viewer');
  
  RETURN new;
END;
$$;

-- Function to create default admin user
CREATE OR REPLACE FUNCTION public.create_default_admin()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_user_id uuid;
  admin_email text := 'admin@localhost.com';
  admin_username text := 'admin';
  admin_password text := 'admin123456';
BEGIN
  -- Check if admin user already exists
  SELECT id INTO admin_user_id 
  FROM auth.users 
  WHERE email = admin_email;
  
  -- If admin doesn't exist, create it
  IF admin_user_id IS NULL THEN
    -- Insert user into auth.users table
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      admin_email,
      crypt(admin_password, gen_salt('bf')),
      now(),
      jsonb_build_object('username', admin_username),
      now(),
      now(),
      '',
      '',
      '',
      ''
    ) RETURNING id INTO admin_user_id;
    
    -- Create profile for admin user
    INSERT INTO public.profiles (id, username, full_name, status)
    VALUES (admin_user_id, admin_username, 'System Administrator', true)
    ON CONFLICT (id) DO NOTHING;
    
    -- Set admin role (remove viewer role if exists)
    DELETE FROM public.user_roles WHERE user_id = admin_user_id AND role = 'viewer';
    INSERT INTO public.user_roles (user_id, role)
    VALUES (admin_user_id, 'super_admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RAISE NOTICE 'Default admin user created successfully with email: %', admin_email;
  ELSE
    RAISE NOTICE 'Default admin user already exists';
  END IF;
END;
$$;

-- RPC function to execute arbitrary SQL (for dynamic schema changes)
CREATE OR REPLACE FUNCTION public.execute_sql(sql text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  EXECUTE sql;
  result := jsonb_build_object('success', true);
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    result := jsonb_build_object('success', false, 'error', SQLERRM);
    RETURN result;
END;
$$;

-- Function to check if a column exists in the servers table
CREATE OR REPLACE FUNCTION public.column_exists(
  column_name text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'servers'
    AND column_name = $1
  );
END;
$$;

-- Add comment to column_exists function
COMMENT ON FUNCTION public.column_exists IS 'Checks if a column exists in the servers table';

-- ============================================================================
-- 5. TRIGGERS
-- ============================================================================

-- Trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Triggers for updated_at timestamps
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

CREATE TRIGGER update_property_definitions_updated_at
  BEFORE UPDATE ON public.property_definitions
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

CREATE TRIGGER update_servers_updated_at
  BEFORE UPDATE ON public.servers
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- ============================================================================
-- 6. RLS POLICIES
-- ============================================================================

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Super admins can manage all profiles" ON public.profiles
  FOR ALL USING (has_role(auth.uid(), 'super_admin'::public.user_role));

-- User roles policies
CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Super admins can manage all roles" ON public.user_roles
  FOR ALL USING (has_role(auth.uid(), 'super_admin'::public.user_role));

-- Property definitions policies
CREATE POLICY "Anyone can view property definitions" ON public.property_definitions
  FOR SELECT USING (true);

CREATE POLICY "Engineers can manage property definitions" ON public.property_definitions
  FOR ALL USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'engineer'::public.user_role));

CREATE POLICY "Super admins can manage property definitions" ON public.property_definitions
  FOR ALL USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'super_admin'::public.user_role));

-- Servers policies
CREATE POLICY "Anyone can view servers" ON public.servers
  FOR SELECT USING (true);

CREATE POLICY "Engineers can insert servers" ON public.servers
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'engineer'::public.user_role));

CREATE POLICY "Engineers can update servers" ON public.servers
  FOR UPDATE USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'engineer'::public.user_role));

CREATE POLICY "Super admins can do all servers" ON public.servers
  FOR ALL USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'super_admin'::public.user_role));

-- ============================================================================
-- 7. INITIAL DATA AND SETUP
-- ============================================================================

-- Create the default admin user
SELECT public.create_default_admin();

-- ============================================================================
-- 8. PROPERTY MANAGEMENT FUNCTIONS
-- ============================================================================

-- Function to safely drop server columns
CREATE OR REPLACE FUNCTION public.drop_server_column(p_column_name TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Check if column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'servers' 
    AND column_name = p_column_name
  ) THEN
    result := jsonb_build_object('success', false, 'error', 'Column does not exist');
    RETURN result;
  END IF;
  
  -- Drop the column
  EXECUTE format('ALTER TABLE public.servers DROP COLUMN IF EXISTS %I', p_column_name);
  
  result := jsonb_build_object('success', true, 'message', 'Column dropped successfully');
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    result := jsonb_build_object('success', false, 'error', SQLERRM);
    RETURN result;
END;
$$;

-- Function to get property definitions with server schema information
CREATE OR REPLACE FUNCTION public.get_property_definitions_with_schema()
RETURNS TABLE (
  id UUID,
  key TEXT,
  name TEXT,
  display_name TEXT,
  property_type TEXT,
  description TEXT,
  category TEXT,
  required BOOLEAN,
  default_value TEXT,
  options JSONB,
  active BOOLEAN,
  sort_order INTEGER,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  column_exists BOOLEAN,
  column_type TEXT,
  is_nullable TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pd.id,
    pd.key,
    pd.name,
    pd.display_name,
    pd.property_type,
    pd.description,
    pd.category,
    pd.required,
    pd.default_value,
    pd.options,
    pd.active,
    pd.sort_order,
    pd.created_at,
    pd.updated_at,
    EXISTS (
      SELECT 1 FROM information_schema.columns isc1
      WHERE isc1.table_schema = 'public' 
      AND isc1.table_name = 'servers' 
      AND isc1.column_name = pd.key
    ) AS column_exists,
    COALESCE(
      (SELECT isc2.data_type::TEXT FROM information_schema.columns isc2
       WHERE isc2.table_schema = 'public' 
       AND isc2.table_name = 'servers' 
       AND isc2.column_name = pd.key), 
      ''::TEXT
    ) AS column_type,
    COALESCE(
      (SELECT isc3.is_nullable::TEXT FROM information_schema.columns isc3
       WHERE isc3.table_schema = 'public' 
       AND isc3.table_name = 'servers' 
       AND isc3.column_name = pd.key), 
      'YES'::TEXT
    ) AS is_nullable
  FROM public.property_definitions pd
  WHERE pd.active = true
  ORDER BY pd.sort_order, pd.name;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.drop_server_column(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_property_definitions_with_schema() TO authenticated;

-- Comments for documentation
COMMENT ON FUNCTION public.drop_server_column(TEXT) 
IS 'Safely drops a column from the servers table with error handling';

COMMENT ON FUNCTION public.get_property_definitions_with_schema() 
IS 'Returns property definitions with server table schema information for dynamic form generation';

-- ============================================================================
-- 8. GRANT PERMISSIONS
-- ============================================================================

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- ============================================================================
-- SETUP COMPLETE
-- ============================================================================

-- Display setup completion message
DO $$
BEGIN
  RAISE NOTICE '==================================================';
  RAISE NOTICE 'Datacenter Server Inventory Database Setup Complete!';
  RAISE NOTICE '==================================================';
  RAISE NOTICE 'Default admin credentials:';
  RAISE NOTICE 'Email: admin@localhost.com';
  RAISE NOTICE 'Password: admin123456';
  RAISE NOTICE '==================================================';
  RAISE NOTICE 'Please change the admin password after first login!';
  RAISE NOTICE '==================================================';
END;
$$;

-- ============================================================================
-- 7. UTILITY FUNCTIONS
-- ============================================================================

-- Function to get all enum values for the application (dynamically discovers all enums)
CREATE OR REPLACE FUNCTION public.get_enum_values()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  enum_record RECORD;
  enum_obj jsonb := '{}';
  enum_values text[];
  enum_key text;
BEGIN
  -- Build a dynamic JSON object with all enum types
  FOR enum_record IN 
    SELECT t.typname
    FROM pg_type t
    JOIN pg_namespace n ON t.typnamespace = n.oid
    WHERE t.typtype = 'e' 
    AND n.nspname = 'public'
    ORDER BY t.typname
  LOOP
    -- Get all enum values for this type
    SELECT array_agg(e.enumlabel ORDER BY e.enumsortorder)
    INTO enum_values
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = enum_record.typname;
    
    -- Convert type name to frontend key format
    -- Examples: device_type -> deviceTypes, server_status -> status, brand_type -> brands
    enum_key := CASE 
      WHEN enum_record.typname = 'server_status' THEN 'status'
      WHEN enum_record.typname = 'device_type' THEN 'deviceTypes'
      WHEN enum_record.typname = 'allocation_type' THEN 'allocationTypes'
      WHEN enum_record.typname = 'environment_type' THEN 'environmentTypes'
      WHEN enum_record.typname = 'brand_type' THEN 'brands'
      WHEN enum_record.typname = 'model_type' THEN 'models'
      WHEN enum_record.typname = 'os_type' THEN 'osTypes'
      WHEN enum_record.typname = 'site_type' THEN 'sites'
      WHEN enum_record.typname = 'building_type' THEN 'buildings'
      WHEN enum_record.typname = 'rack_type' THEN 'racks'
      WHEN enum_record.typname = 'unit_type' THEN 'units'
      WHEN enum_record.typname = 'user_role' THEN 'userRoles'
      ELSE enum_record.typname  -- For new dynamic enums, use the type name as-is
    END;
    
    -- Add this enum to the result object using jsonb concatenation
    IF enum_values IS NOT NULL THEN
      enum_obj := enum_obj || jsonb_build_object(enum_key, enum_values);
    END IF;
  END LOOP;
  
  -- Convert jsonb back to json for return
  RETURN enum_obj::json;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_enum_values() TO authenticated;

-- Comment for documentation
COMMENT ON FUNCTION public.get_enum_values() IS 'Returns all enum values used in the application as a JSON object';

-- Function to get table schema information
CREATE OR REPLACE FUNCTION public.get_table_schema(
    p_table_name text DEFAULT 'servers'
)
RETURNS TABLE (
    column_name text,
    data_type text,
    is_nullable text,
    column_default text,
    is_enum boolean,
    enum_values text[]
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH enum_types AS (
        SELECT 
            t.typname,
            array_agg(e.enumlabel::text ORDER BY e.enumsortorder) AS enum_values
        FROM 
            pg_type t
            JOIN pg_enum e ON t.oid = e.enumtypid
            JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
        GROUP BY 
            t.typname
    )
    SELECT 
        c.column_name::text,
        c.udt_name::text AS data_type,
        c.is_nullable::text,
        c.column_default::text,
        EXISTS (
            SELECT 1 
            FROM pg_type t 
            JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace 
            WHERE t.typname = c.udt_name 
            AND n.nspname = 'public'
            AND t.typtype = 'e'
        ) AS is_enum,
        COALESCE((
            SELECT e.enum_values
            FROM enum_types e
            JOIN pg_catalog.pg_type pt ON e.typname = pt.typname
            WHERE pt.typname = c.udt_name
        ), ARRAY[]::text[]) AS enum_values
    FROM 
        information_schema.columns c
    WHERE 
        c.table_schema = 'public' 
        AND c.table_name = p_table_name
    ORDER BY 
        c.ordinal_position;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_table_schema(text) TO authenticated;

-- Comment for documentation
COMMENT ON FUNCTION public.get_table_schema(text) 
IS 'Returns schema information for a specified table, including enum values for enum columns';

-- ============================================================================
-- 8. DEBUG AND TESTING FUNCTIONS
-- ============================================================================

-- Debug function to test enum detection (can be removed after fixing)
CREATE OR REPLACE FUNCTION public.debug_enum_detection()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
    debug_info json;
BEGIN
    -- Get basic info about enum types
    SELECT json_agg(
        json_build_object(
            'typname', t.typname,
            'typtype', t.typtype,
            'namespace', n.nspname
        )
    ) INTO debug_info
    FROM pg_type t
    JOIN pg_namespace n ON t.typnamespace = n.oid
    WHERE t.typtype = 'e' AND n.nspname = 'public';
    
    -- Get column info for servers table
    SELECT json_build_object(
        'enum_types', debug_info,
        'test_enum_values', (SELECT get_enum_values()),
        'servers_columns', (
            SELECT json_agg(
                json_build_object(
                    'column_name', column_name,
                    'udt_name', udt_name,
                    'data_type', data_type
                )
            )
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'servers'
        )
    ) INTO result;
    
    RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.debug_enum_detection() TO authenticated;