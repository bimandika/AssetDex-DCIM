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
  'RACK-11', 'RACK-12', 'RACK-13', 'RACK-14', 'RACK-15',
  'RACK-16', 'RACK-17', 'RACK-18', 'RACK-19', 'RACK-20',
  'RACK-21', 'RACK-22', 'RACK-23', 'RACK-24', 'RACK-25',
  'RACK-26', 'RACK-27', 'RACK-28', 'RACK-29', 'RACK-30',
  'RACK-31', 'RACK-32', 'RACK-33', 'RACK-34', 'RACK-35',
  'RACK-36', 'RACK-37', 'RACK-38', 'RACK-39', 'RACK-40',
  'RACK-41', 'RACK-42', 'RACK-43', 'RACK-44', 'RACK-45',
  'RACK-46', 'RACK-47', 'RACK-48', 'RACK-49', 'RACK-50'
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

-- Floor types
CREATE TYPE public.floor_type AS ENUM ('1', '2', '3', '4', '5', 'B1', 'B2', 'Ground', 'Mezzanine');

-- Room types  
CREATE TYPE public.room_type AS ENUM (
  'MDF', '101', '102', '103', '104', '105', '106', '107', '108', '109', '110',
  '201', '202', '203', '204', '205', '206', '207', '208', '209', '210',
  '301', '302', '303', '304', '305', '306', '307', '308', '309', '310',
  '401', '402', '403', '404', '405', '406', '407', '408', '409', '410',
  'Server Room A', 'Server Room B', 'Network Room', 'Storage Room', 'Other'
);

-- ============================================================================
-- 2. TABLES
-- ============================================================================

-- Rack metadata table for additional rack information (RackView enhancement)
-- This table must be created FIRST to establish foreign key relationships
CREATE TABLE IF NOT EXISTS public.rack_metadata (
    rack_name public.rack_type PRIMARY KEY,
    dc_site public.site_type NOT NULL,
    dc_building public.building_type,
    dc_floor public.floor_type,
    dc_room public.room_type,
    description TEXT CHECK (LENGTH(description) <= 40),
    total_units INTEGER DEFAULT 42,
    power_capacity_watts INTEGER,
    cooling_capacity_btu INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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
    dc_floor public.floor_type,
    dc_room public.room_type,
    allocation public.allocation_type,
    status public.server_status DEFAULT 'Active'::public.server_status,
    device_type public.device_type NOT NULL,
    rack public.rack_type REFERENCES public.rack_metadata(rack_name) ON DELETE SET NULL ON UPDATE CASCADE,
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

-- Insert rack metadata FIRST (required for foreign key constraint)
INSERT INTO public.rack_metadata (rack_name, dc_site, dc_building, dc_floor, dc_room) VALUES
('RACK-01', 'DC-East', 'Building-A', '1', 'MDF'),     -- Production & Network
('RACK-02', 'DC-East', 'Building-A', '2', '201'),     -- Storage & Backup  
('RACK-03', 'DC-East', 'Building-A', '3', '301');     -- Development & Testing

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

-- ============================================================================
-- DUMMY DATA FOR TESTING ROOMVIEW.TSX WITH 20 RACKS
-- ============================================================================
-- This section contains comprehensive dummy data for testing the RoomView.tsx component
-- with 20 racks across 3 data centers and ~200 servers with varied configurations.
-- 
-- To remove this dummy data later, delete everything between these comment blocks:
-- "DUMMY DATA FOR TESTING ROOMVIEW.TSX" and "END DUMMY DATA SECTION"

-- PHASE 1: RACK METADATA (20 new racks)
-- Adding RACK-04 to RACK-20, plus RACK-25, RACK-30, RACK-31

INSERT INTO public.rack_metadata (rack_name, dc_site, dc_building, dc_floor, dc_room, description) VALUES
-- Production Racks (High Density)
('RACK-04', 'DC-East', 'Building-A', '2', '201', 'Production Web Services'),
('RACK-05', 'DC-East', 'Building-A', '2', '202', 'Production Application Tier'),
('RACK-06', 'DC-West', 'Building-B', '1', '101', 'Production Database Cluster'),
('RACK-07', 'DC-North', 'Building-C', '1', '102', 'Development Environment'),
('RACK-08', 'DC-North', 'Building-C', '2', '201', 'Testing Infrastructure'),
('RACK-09', 'DC-Central', 'Building-A', '1', 'MDF', 'Container Platform'),
('RACK-10', 'DC-Central', 'Building-A', '3', '301', 'Monitoring & Analytics'),

-- Development/Testing Racks (Medium Density)
('RACK-11', 'DC-South', 'Building-D', '1', '103', 'Pre-Production Environment'),
('RACK-12', 'DC-South', 'Building-D', '2', '203', 'QA Environment'),
('RACK-13', 'DC-North', 'Building-C', '3', '302', 'Staging Services'),
('RACK-14', 'DC-North', 'Building-C', '3', '303', 'Development Database'),
('RACK-15', 'DC1', 'Building-E', '1', '104', 'Performance Testing'),
('RACK-16', 'DC2', 'Building-B', '4', '401', 'Research & Development'),

-- Storage Racks (Low Density)
('RACK-17', 'DC-Central', 'Building-A', 'Ground', 'Storage Room', 'Primary Storage Array'),
('RACK-18', 'DC1', 'Building-E', 'B1', 'Storage Room', 'Backup Infrastructure'),
('RACK-19', 'DC2', 'Building-B', 'B1', 'Storage Room', 'Archive Storage'),

-- Network/Infrastructure Racks (Very Low Density)
('RACK-20', 'DC-East', 'Building-A', '1', 'MDF', 'Core Network Equipment'),
('RACK-25', 'DC-West', 'Building-B', '1', 'Network Room', 'Edge Network'),
('RACK-30', 'DC3', 'Building-C', '1', 'Server Room A', 'Remote Site Infrastructure'),
('RACK-31', 'DC4', 'Building-D', '1', 'Server Room B', 'Emergency/Spare Rack'),

-- DC-East Building-A Floor 1 MDF Extension (15 new racks)
('RACK-32', 'DC-East', 'Building-A', '1', 'MDF', 'Primary Web Tier'),
('RACK-33', 'DC-East', 'Building-A', '1', 'MDF', 'Application Tier'),
('RACK-34', 'DC-East', 'Building-A', '1', 'MDF', 'Database Cluster'),
('RACK-35', 'DC-East', 'Building-A', '1', 'MDF', 'Storage & Backup'),
('RACK-36', 'DC-East', 'Building-A', '1', 'MDF', 'Network Infrastructure'),
('RACK-37', 'DC-East', 'Building-A', '1', 'MDF', 'Development Environment'),
('RACK-38', 'DC-East', 'Building-A', '1', 'MDF', 'Testing Infrastructure'),
('RACK-39', 'DC-East', 'Building-A', '1', 'MDF', 'Pre-Production'),
('RACK-40', 'DC-East', 'Building-A', '1', 'MDF', 'CI/CD & DevOps'),
('RACK-41', 'DC-East', 'Building-A', '1', 'MDF', 'Container Platform Extension'),
('RACK-42', 'DC-East', 'Building-A', '1', 'MDF', 'AI/ML Infrastructure'),
('RACK-43', 'DC-East', 'Building-A', '1', 'MDF', 'Big Data & Analytics'),
('RACK-44', 'DC-East', 'Building-A', '1', 'MDF', 'Security & Compliance'),
('RACK-45', 'DC-East', 'Building-A', '1', 'MDF', 'Monitoring & Observability'),
('RACK-46', 'DC-East', 'Building-A', '1', 'MDF', 'Disaster Recovery & Backup');

-- PHASE 2: SERVER DATA (82 servers across 20 racks)

-- RACK-04: Production Web Services (22 servers) - FULL RACK DEPLOYMENT
INSERT INTO public.servers (
    id, serial_number, hostname, brand, model, ip_address, ip_oob, operating_system,
    dc_site, dc_building, dc_floor, dc_room,
    allocation, environment, status, device_type, rack, unit, unit_height, warranty, notes, created_by, created_at, updated_at
) VALUES
-- Primary Web Services Layer (Top of rack - U42 down)
(gen_random_uuid(), 'SN2023W040', 'web-prod-04', 'Dell', 'PowerEdge R750', '192.168.1.40', '10.0.4.40', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '2', '201', 'Load Balancer', 'Production', 'Active', 'Server', 'RACK-04', 'U42', 2, '2026-08-01', 'Primary web server', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023W041', 'web-prod-05', 'Dell', 'PowerEdge R750', '192.168.1.41', '10.0.4.41', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '2', '201', 'Load Balancer', 'Production', 'Active', 'Server', 'RACK-04', 'U40', 2, '2026-08-01', 'Secondary web server', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023W042', 'web-prod-06', 'HPE', 'ProLiant DL380', '192.168.1.42', '10.0.4.42', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '2', '201', 'Load Balancer', 'Production', 'Active', 'Server', 'RACK-04', 'U38', 2, '2026-08-01', 'Load balancer frontend', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023W043', 'app-prod-04', 'Dell', 'PowerEdge R740', '192.168.1.43', '10.0.4.43', 'RHEL 8', 'DC-East', 'Building-A', '2', '201', 'IAAS', 'Production', 'Active', 'Server', 'RACK-04', 'U36', 2, '2026-08-01', 'Application server 1', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023W044', 'app-prod-05', 'Dell', 'PowerEdge R740', '192.168.1.44', '10.0.4.44', 'RHEL 8', 'DC-East', 'Building-A', '2', '201', 'IAAS', 'Production', 'Active', 'Server', 'RACK-04', 'U34', 2, '2026-08-01', 'Application server 2', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),

-- Caching and Queue Layer
(gen_random_uuid(), 'SN2023W045', 'cache-prod-01', 'HPE', 'ProLiant DL360', '192.168.1.45', '10.0.4.45', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '2', '201', 'IAAS', 'Production', 'Active', 'Server', 'RACK-04', 'U32', 1, '2026-08-01', 'Redis cache server', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023W046', 'queue-prod-01', 'HPE', 'ProLiant DL360', '192.168.1.46', '10.0.4.46', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '2', '201', 'IAAS', 'Production', 'Active', 'Server', 'RACK-04', 'U31', 1, '2026-08-01', 'Message queue server', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023W050', 'cache-prod-02', 'HPE', 'ProLiant DL360', '192.168.1.50', '10.0.4.50', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '2', '201', 'IAAS', 'Production', 'Active', 'Server', 'RACK-04', 'U30', 1, '2026-08-01', 'Redis cache server 2', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),

-- API and Gateway Layer
(gen_random_uuid(), 'SN2023W047', 'api-prod-01', 'Dell', 'PowerEdge R750', '192.168.1.47', '10.0.4.47', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '2', '201', 'PAAS', 'Production', 'Active', 'Server', 'RACK-04', 'U29', 2, '2026-08-01', 'API gateway', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023W048', 'session-prod-01', 'HPE', 'ProLiant DL380', '192.168.1.48', '10.0.4.48', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '2', '201', 'IAAS', 'Production', 'Active', 'Server', 'RACK-04', 'U27', 2, '2026-08-01', 'Session management', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023W049', 'cdn-prod-01', 'Dell', 'PowerEdge R750', '192.168.1.49', '10.0.4.49', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '2', '201', 'PAAS', 'Production', 'Active', 'Server', 'RACK-04', 'U25', 2, '2026-08-01', 'Content delivery', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),

-- Additional Web Services (Added to fill rack)
(gen_random_uuid(), 'SN2023W051', 'web-prod-07', 'Dell', 'PowerEdge R750', '192.168.1.51', '10.0.4.51', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '2', '201', 'PAAS', 'Production', 'Active', 'Server', 'RACK-04', 'U23', 2, '2026-08-01', 'Web server 3', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023W052', 'web-prod-08', 'HPE', 'ProLiant DL380', '192.168.1.52', '10.0.4.52', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '2', '201', 'PAAS', 'Production', 'Active', 'Server', 'RACK-04', 'U21', 2, '2026-08-01', 'Web server 4', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023W053', 'app-prod-06', 'Dell', 'PowerEdge R740', '192.168.1.53', '10.0.4.53', 'RHEL 8', 'DC-East', 'Building-A', '2', '201', 'IAAS', 'Production', 'Active', 'Server', 'RACK-04', 'U19', 2, '2026-08-01', 'Application server 3', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023W054', 'app-prod-07', 'HPE', 'ProLiant DL380', '192.168.1.54', '10.0.4.54', 'RHEL 8', 'DC-East', 'Building-A', '2', '201', 'IAAS', 'Production', 'Active', 'Server', 'RACK-04', 'U17', 2, '2026-08-01', 'Application server 4', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023W055', 'api-prod-02', 'Dell', 'PowerEdge R750', '192.168.1.55', '10.0.4.55', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '2', '201', 'PAAS', 'Production', 'Active', 'Server', 'RACK-04', 'U15', 2, '2026-08-01', 'API gateway 2', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),

-- Monitoring and Support Services
(gen_random_uuid(), 'SN2023W056', 'monitor-prod-01', 'HPE', 'ProLiant DL360', '192.168.1.56', '10.0.4.56', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '2', '201', 'IAAS', 'Production', 'Active', 'Server', 'RACK-04', 'U13', 1, '2026-08-01', 'Monitoring server', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023W057', 'log-prod-01', 'HPE', 'ProLiant DL360', '192.168.1.57', '10.0.4.57', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '2', '201', 'IAAS', 'Production', 'Active', 'Server', 'RACK-04', 'U12', 1, '2026-08-01', 'Log aggregation', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023W058', 'metrics-prod-01', 'Dell', 'PowerEdge R750', '192.168.1.58', '10.0.4.58', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '2', '201', 'IAAS', 'Production', 'Active', 'Server', 'RACK-04', 'U11', 2, '2026-08-01', 'Metrics collection', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),

-- Load Testing and Performance
(gen_random_uuid(), 'SN2023W059', 'loadtest-prod-01', 'HPE', 'ProLiant DL380', '192.168.1.59', '10.0.4.59', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '2', '201', 'IAAS', 'Production', 'Active', 'Server', 'RACK-04', 'U9', 2, '2026-08-01', 'Load testing server', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023W060', 'perf-prod-01', 'Dell', 'PowerEdge R740', '192.168.1.60', '10.0.4.60', 'RHEL 8', 'DC-East', 'Building-A', '2', '201', 'IAAS', 'Production', 'Active', 'Server', 'RACK-04', 'U7', 2, '2026-08-01', 'Performance analysis', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),

-- Bottom rack servers (1U servers for efficiency)
(gen_random_uuid(), 'SN2023W061', 'proxy-prod-01', 'HPE', 'ProLiant DL360', '192.168.1.61', '10.0.4.61', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '2', '201', 'PAAS', 'Production', 'Active', 'Server', 'RACK-04', 'U5', 1, '2026-08-01', 'Reverse proxy', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023W062', 'firewall-prod-01', 'HPE', 'ProLiant DL360', '192.168.1.62', '10.0.4.62', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '2', '201', 'IAAS', 'Production', 'Active', 'Server', 'RACK-04', 'U4', 1, '2026-08-01', 'Web application firewall', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023W063', 'backup-prod-01', 'HPE', 'ProLiant DL360', '192.168.1.63', '10.0.4.63', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '2', '201', 'IAAS', 'Production', 'Active', 'Server', 'RACK-04', 'U3', 1, '2026-08-01', 'Backup coordination', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023W064', 'util-prod-01', 'HPE', 'ProLiant DL360', '192.168.1.64', '10.0.4.64', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '2', '201', 'IAAS', 'Production', 'Active', 'Server', 'RACK-04', 'U2', 1, '2026-08-01', 'Utility services', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023W065', 'mgmt-prod-01', 'HPE', 'ProLiant DL360', '192.168.1.65', '10.0.4.65', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '2', '201', 'IAAS', 'Production', 'Active', 'Server', 'RACK-04', 'U1', 1, '2026-08-01', 'Management services', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW());

-- RACK-05: Production Application Tier (9 servers)
INSERT INTO public.servers (
    id, serial_number, hostname, brand, model, ip_address, ip_oob, operating_system,
    dc_site, dc_building, dc_floor, dc_room,
    allocation, environment, status, device_type, rack, unit, unit_height, warranty, notes, created_by, created_at, updated_at
) VALUES
(gen_random_uuid(), 'SN2023A050', 'app-tier-01', 'Dell', 'PowerEdge R750', '192.168.1.50', '10.0.5.50', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '2', '202', 'IAAS', 'Production', 'Active', 'Server', 'RACK-05', 'U42', 2, '2026-08-01', 'Business logic tier 1', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023A051', 'app-tier-02', 'Dell', 'PowerEdge R750', '192.168.1.51', '10.0.5.51', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '2', '202', 'IAAS', 'Production', 'Active', 'Server', 'RACK-05', 'U40', 2, '2026-08-01', 'Business logic tier 2', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023A052', 'app-tier-03', 'HPE', 'ProLiant DL380', '192.168.1.52', '10.0.5.52', 'Oracle Linux 8', 'DC-East', 'Building-A', '2', '202', 'IAAS', 'Production', 'Active', 'Server', 'RACK-05', 'U38', 2, '2026-08-01', 'Business logic tier 3', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023A053', 'worker-prod-01', 'Dell', 'PowerEdge R750', '192.168.1.53', '10.0.5.53', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '2', '202', 'PAAS', 'Production', 'Active', 'Server', 'RACK-05', 'U36', 2, '2026-08-01', 'Background worker 1', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023A054', 'worker-prod-02', 'Dell', 'PowerEdge R750', '192.168.1.54', '10.0.5.54', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '2', '202', 'PAAS', 'Production', 'Active', 'Server', 'RACK-05', 'U34', 2, '2026-08-01', 'Background worker 2', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023A055', 'scheduler-prod-01', 'HPE', 'ProLiant DL380', '192.168.1.55', '10.0.5.55', 'Oracle Linux 8', 'DC-East', 'Building-A', '2', '202', 'PAAS', 'Production', 'Active', 'Server', 'RACK-05', 'U32', 2, '2026-08-01', 'Job scheduler', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023A056', 'elastic-prod-01', 'Dell', 'PowerEdge R750', '192.168.1.56', '10.0.5.56', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '2', '202', 'IAAS', 'Production', 'Active', 'Server', 'RACK-05', 'U30', 2, '2026-08-01', 'Search engine', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023A057', 'metrics-prod-01', 'HPE', 'ProLiant DL360', '192.168.1.57', '10.0.5.57', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '2', '202', 'IAAS', 'Production', 'Active', 'Server', 'RACK-05', 'U28', 1, '2026-08-01', 'Metrics collection', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023A058', 'config-prod-01', 'HPE', 'ProLiant DL360', '192.168.1.58', '10.0.5.58', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '2', '202', 'IAAS', 'Production', 'Active', 'Server', 'RACK-05', 'U27', 1, '2026-08-01', 'Configuration server', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW());

-- RACK-06: Production Database Cluster (8 servers)
INSERT INTO public.servers (
    id, serial_number, hostname, brand, model, ip_address, ip_oob, operating_system,
    dc_site, dc_building, dc_floor, dc_room,
    allocation, environment, status, device_type, rack, unit, unit_height, warranty, notes, created_by, created_at, updated_at
) VALUES
(gen_random_uuid(), 'SN2023D060', 'db-cluster-01', 'HPE', 'ProLiant DL380', '192.168.2.60', '10.0.6.60', 'Oracle Linux 8', 'DC-West', 'Building-B', '1', '101', 'Database', 'Production', 'Active', 'Server', 'RACK-06', 'U42', 2, '2026-08-01', 'Primary database node', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023D061', 'db-cluster-02', 'HPE', 'ProLiant DL380', '192.168.2.61', '10.0.6.61', 'Oracle Linux 8', 'DC-West', 'Building-B', '1', '101', 'Database', 'Production', 'Active', 'Server', 'RACK-06', 'U40', 2, '2026-08-01', 'Secondary DB node', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023D062', 'db-cluster-03', 'Dell', 'PowerEdge R750xd', '192.168.2.62', '10.0.6.62', 'Oracle Linux 8', 'DC-West', 'Building-B', '1', '101', 'Database', 'Production', 'Active', 'Server', 'RACK-06', 'U38', 2, '2026-08-01', 'Tertiary DB node', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023D063', 'db-read-01', 'HPE', 'ProLiant DL380', '192.168.2.63', '10.0.6.63', 'RHEL 8', 'DC-West', 'Building-B', '1', '101', 'Database', 'Production', 'Active', 'Server', 'RACK-06', 'U36', 2, '2026-08-01', 'Read replica 1', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023D064', 'db-read-02', 'HPE', 'ProLiant DL380', '192.168.2.64', '10.0.6.64', 'RHEL 8', 'DC-West', 'Building-B', '1', '101', 'Database', 'Production', 'Active', 'Server', 'RACK-06', 'U34', 2, '2026-08-01', 'Read replica 2', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023D065', 'db-analytics-01', 'Dell', 'PowerEdge R750xd', '192.168.2.65', '10.0.6.65', 'Oracle Linux 8', 'DC-West', 'Building-B', '1', '101', 'Database', 'Production', 'Active', 'Server', 'RACK-06', 'U32', 2, '2026-08-01', 'Analytics database', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023D066', 'db-proxy-01', 'HPE', 'ProLiant DL360', '192.168.2.66', '10.0.6.66', 'Ubuntu 22.04 LTS', 'DC-West', 'Building-B', '1', '101', 'Database', 'Production', 'Active', 'Server', 'RACK-06', 'U30', 1, '2026-08-01', 'Database proxy', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023D067', 'db-monitor-01', 'HPE', 'ProLiant DL360', '192.168.2.67', '10.0.6.67', 'Ubuntu 22.04 LTS', 'DC-West', 'Building-B', '1', '101', 'Database', 'Production', 'Active', 'Server', 'RACK-06', 'U29', 1, '2026-08-01', 'DB monitoring', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW());

-- RACK-07: Development Environment (5 servers)
INSERT INTO public.servers (
    id, serial_number, hostname, brand, model, ip_address, ip_oob, operating_system,
    dc_site, dc_building, dc_floor, dc_room,
    allocation, environment, status, device_type, rack, unit, unit_height, warranty, notes, created_by, created_at, updated_at
) VALUES
(gen_random_uuid(), 'SN2023D070', 'dev-web-02', 'Dell', 'PowerEdge R740', '192.168.5.70', '10.0.7.70', 'Ubuntu 22.04 LTS', 'DC-North', 'Building-C', '1', '102', 'IAAS', 'Development', 'Active', 'Server', 'RACK-07', 'U42', 2, '2026-08-01', 'Dev web server', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023D071', 'dev-app-02', 'Dell', 'PowerEdge R740', '192.168.5.71', '10.0.7.71', 'Ubuntu 22.04 LTS', 'DC-North', 'Building-C', '1', '102', 'IAAS', 'Development', 'Active', 'Server', 'RACK-07', 'U40', 2, '2026-08-01', 'Dev app server', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023D072', 'dev-db-02', 'HPE', 'ProLiant DL360', '192.168.5.72', '10.0.7.72', 'Ubuntu 20.04 LTS', 'DC-North', 'Building-C', '1', '102', 'IAAS', 'Development', 'Active', 'Server', 'RACK-07', 'U38', 1, '2026-08-01', 'Dev database', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023D073', 'dev-cache-01', 'HPE', 'ProLiant DL360', '192.168.5.73', '10.0.7.73', 'Ubuntu 22.04 LTS', 'DC-North', 'Building-C', '1', '102', 'IAAS', 'Development', 'Active', 'Server', 'RACK-07', 'U37', 1, '2026-08-01', 'Dev cache server', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023D074', 'dev-tools-01', 'Dell', 'PowerEdge R740', '192.168.5.74', '10.0.7.74', 'Ubuntu 20.04 LTS', 'DC-North', 'Building-C', '1', '102', 'IAAS', 'Development', 'Active', 'Server', 'RACK-07', 'U36', 2, '2026-08-01', 'Dev tools server', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW());

-- RACK-08: Testing Infrastructure (4 servers)
INSERT INTO public.servers (
    id, serial_number, hostname, brand, model, ip_address, ip_oob, operating_system,
    dc_site, dc_building, dc_floor, dc_room,
    allocation, environment, status, device_type, rack, unit, unit_height, warranty, notes, created_by, created_at, updated_at
) VALUES
(gen_random_uuid(), 'SN2023T080', 'test-web-02', 'Dell', 'PowerEdge R740', '192.168.6.80', '10.0.8.80', 'Ubuntu 20.04 LTS', 'DC-North', 'Building-C', '2', '201', 'IAAS', 'Testing', 'Active', 'Server', 'RACK-08', 'U42', 2, '2026-08-01', 'Test web server', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023T081', 'test-api-01', 'HPE', 'ProLiant DL360', '192.168.6.81', '10.0.8.81', 'Ubuntu 20.04 LTS', 'DC-North', 'Building-C', '2', '201', 'PAAS', 'Testing', 'Active', 'Server', 'RACK-08', 'U40', 1, '2026-08-01', 'Test API server', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023T082', 'test-load-01', 'HPE', 'ProLiant DL360', '192.168.6.82', '10.0.8.82', 'Windows Server 2022', 'DC-North', 'Building-C', '2', '201', 'IAAS', 'Testing', 'Active', 'Server', 'RACK-08', 'U39', 1, '2026-08-01', 'Load testing', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023T083', 'test-perf-01', 'Dell', 'PowerEdge R750', '192.168.6.83', '10.0.8.83', 'Ubuntu 22.04 LTS', 'DC-North', 'Building-C', '2', '201', 'IAAS', 'Testing', 'Active', 'Server', 'RACK-08', 'U38', 2, '2026-08-01', 'Performance testing', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW());

-- RACK-09: Container Platform (6 servers)
INSERT INTO public.servers (
    id, serial_number, hostname, brand, model, ip_address, ip_oob, operating_system,
    dc_site, dc_building, dc_floor, dc_room,
    allocation, environment, status, device_type, rack, unit, unit_height, warranty, notes, created_by, created_at, updated_at
) VALUES
(gen_random_uuid(), 'SN2023K090', 'k8s-master-01', 'Dell', 'PowerEdge R750', '192.168.1.90', '10.0.9.90', 'Ubuntu 22.04 LTS', 'DC-Central', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-09', 'U42', 2, '2026-08-01', 'K8s master node 1', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023K091', 'k8s-master-02', 'Dell', 'PowerEdge R750', '192.168.1.91', '10.0.9.91', 'Ubuntu 22.04 LTS', 'DC-Central', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-09', 'U40', 2, '2026-08-01', 'K8s master node 2', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023K092', 'k8s-worker-01', 'HPE', 'Apollo 4510', '192.168.1.92', '10.0.9.92', 'Ubuntu 22.04 LTS', 'DC-Central', 'Building-A', '1', 'MDF', 'PAAS', 'Production', 'Active', 'Server', 'RACK-09', 'U38', 2, '2026-08-01', 'K8s worker node 1', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023K093', 'k8s-worker-02', 'HPE', 'Apollo 4510', '192.168.1.93', '10.0.9.93', 'Ubuntu 22.04 LTS', 'DC-Central', 'Building-A', '1', 'MDF', 'PAAS', 'Production', 'Active', 'Server', 'RACK-09', 'U36', 2, '2026-08-01', 'K8s worker node 2', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023K094', 'k8s-storage-01', 'Dell', 'PowerEdge R750', '192.168.1.94', '10.0.9.94', 'Ubuntu 22.04 LTS', 'DC-Central', 'Building-A', '1', 'MDF', 'PAAS', 'Production', 'Active', 'Server', 'RACK-09', 'U34', 2, '2026-08-01', 'K8s storage node', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023K095', 'docker-reg-01', 'HPE', 'ProLiant DL360', '192.168.1.95', '10.0.9.95', 'Ubuntu 22.04 LTS', 'DC-Central', 'Building-A', '1', 'MDF', 'PAAS', 'Production', 'Active', 'Server', 'RACK-09', 'U32', 1, '2026-08-01', 'Docker registry', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW());

-- RACK-10: Monitoring & Analytics (4 servers)
INSERT INTO public.servers (
    id, serial_number, hostname, brand, model, ip_address, ip_oob, operating_system,
    dc_site, dc_building, dc_floor, dc_room,
    allocation, environment, status, device_type, rack, unit, unit_height, warranty, notes, created_by, created_at, updated_at
) VALUES
(gen_random_uuid(), 'SN2023M100', 'monitor-02', 'Dell', 'PowerEdge R750', '192.168.8.100', '10.0.10.100', 'Ubuntu 22.04 LTS', 'DC-Central', 'Building-A', '3', '301', 'IAAS', 'Production', 'Active', 'Server', 'RACK-10', 'U42', 2, '2026-08-01', 'Prometheus server', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023M101', 'grafana-01', 'HPE', 'ProLiant DL360', '192.168.8.101', '10.0.10.101', 'Ubuntu 22.04 LTS', 'DC-Central', 'Building-A', '3', '301', 'IAAS', 'Production', 'Active', 'Server', 'RACK-10', 'U40', 1, '2026-08-01', 'Grafana dashboard', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023M102', 'elk-stack-01', 'Dell', 'PowerEdge R750', '192.168.8.102', '10.0.10.102', 'RHEL 8', 'DC-Central', 'Building-A', '3', '301', 'IAAS', 'Production', 'Active', 'Server', 'RACK-10', 'U39', 2, '2026-08-01', 'ELK logging stack', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023M103', 'alerting-01', 'HPE', 'ProLiant DL360', '192.168.8.103', '10.0.10.103', 'Ubuntu 22.04 LTS', 'DC-Central', 'Building-A', '3', '301', 'IAAS', 'Production', 'Active', 'Server', 'RACK-10', 'U37', 1, '2026-08-01', 'Alert manager', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW());

-- RACK-11: Pre-Production Environment (6 servers)
INSERT INTO public.servers (
    id, serial_number, hostname, brand, model, ip_address, ip_oob, operating_system,
    dc_site, dc_building, dc_floor, dc_room,
    allocation, environment, status, device_type, rack, unit, unit_height, warranty, notes, created_by, created_at, updated_at
) VALUES
(gen_random_uuid(), 'SN2023P110', 'preprod-web-01', 'Dell', 'PowerEdge R740', '192.168.7.110', '10.0.11.110', 'Ubuntu 20.04 LTS', 'DC-South', 'Building-D', '1', '103', 'IAAS', 'Pre-Production', 'Active', 'Server', 'RACK-11', 'U42', 2, '2026-08-01', 'PreProd web server', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023P111', 'preprod-app-01', 'Dell', 'PowerEdge R740', '192.168.7.111', '10.0.11.111', 'Ubuntu 20.04 LTS', 'DC-South', 'Building-D', '1', '103', 'IAAS', 'Pre-Production', 'Active', 'Server', 'RACK-11', 'U40', 2, '2026-08-01', 'PreProd app server', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023P112', 'preprod-db-01', 'HPE', 'ProLiant DL380', '192.168.7.112', '10.0.11.112', 'RHEL 8', 'DC-South', 'Building-D', '1', '103', 'Database', 'Pre-Production', 'Active', 'Server', 'RACK-11', 'U38', 2, '2026-08-01', 'PreProd database', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023P113', 'preprod-api-01', 'HPE', 'ProLiant DL360', '192.168.7.113', '10.0.11.113', 'Ubuntu 20.04 LTS', 'DC-South', 'Building-D', '1', '103', 'IAAS', 'Pre-Production', 'Active', 'Server', 'RACK-11', 'U36', 1, '2026-08-01', 'PreProd API server', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023P114', 'preprod-cache-01', 'HPE', 'ProLiant DL360', '192.168.7.114', '10.0.11.114', 'Windows Server 2019', 'DC-South', 'Building-D', '1', '103', 'IAAS', 'Pre-Production', 'Active', 'Server', 'RACK-11', 'U35', 1, '2026-08-01', 'PreProd cache', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023P115', 'preprod-mon-01', 'Dell', 'PowerEdge R750', '192.168.7.115', '10.0.11.115', 'Ubuntu 22.04 LTS', 'DC-South', 'Building-D', '1', '103', 'IAAS', 'Pre-Production', 'Active', 'Server', 'RACK-11', 'U34', 2, '2026-08-01', 'PreProd monitoring', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW());

-- Batch 3: RACK-12 through RACK-16 (17 servers)

-- RACK-12: QA Environment (3 servers)
INSERT INTO public.servers (
    id, serial_number, hostname, brand, model, ip_address, ip_oob, operating_system,
    dc_site, dc_building, dc_floor, dc_room,
    allocation, environment, status, device_type, rack, unit, unit_height, warranty, notes, created_by, created_at, updated_at
) VALUES
(gen_random_uuid(), 'SN2023Q120', 'qa-web-01', 'HPE', 'ProLiant DL360', '192.168.6.120', '10.0.12.120', 'Ubuntu 20.04 LTS', 'DC-South', 'Building-D', '2', '203', 'IAAS', 'Testing', 'Active', 'Server', 'RACK-12', 'U42', 1, '2026-08-01', 'QA web server', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023Q121', 'qa-app-01', 'Dell', 'PowerEdge R740', '192.168.6.121', '10.0.12.121', 'Ubuntu 20.04 LTS', 'DC-South', 'Building-D', '2', '203', 'IAAS', 'Testing', 'Active', 'Server', 'RACK-12', 'U40', 2, '2026-08-01', 'QA app server', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023Q122', 'qa-db-01', 'HPE', 'ProLiant DL360', '192.168.6.122', '10.0.12.122', 'Windows Server 2022', 'DC-South', 'Building-D', '2', '203', 'IAAS', 'Testing', 'Active', 'Server', 'RACK-12', 'U38', 1, '2026-08-01', 'QA database', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW());

-- RACK-13: Staging Services (4 servers)
INSERT INTO public.servers (
    id, serial_number, hostname, brand, model, ip_address, ip_oob, operating_system,
    dc_site, dc_building, dc_floor, dc_room,
    allocation, environment, status, device_type, rack, unit, unit_height, warranty, notes, created_by, created_at, updated_at
) VALUES
(gen_random_uuid(), 'SN2023S130', 'stage-web-02', 'Dell', 'PowerEdge R750', '192.168.7.130', '10.0.13.130', 'Ubuntu 22.04 LTS', 'DC-North', 'Building-C', '3', '302', 'IAAS', 'Pre-Production', 'Active', 'Server', 'RACK-13', 'U42', 2, '2026-08-01', 'Staging web server', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023S131', 'stage-app-02', 'Dell', 'PowerEdge R750', '192.168.7.131', '10.0.13.131', 'Ubuntu 22.04 LTS', 'DC-North', 'Building-C', '3', '302', 'PAAS', 'Pre-Production', 'Active', 'Server', 'RACK-13', 'U40', 2, '2026-08-01', 'Staging app server', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023S132', 'stage-db-02', 'HPE', 'ProLiant DL380', '192.168.7.132', '10.0.13.132', 'Oracle Linux 8', 'DC-North', 'Building-C', '3', '302', 'Database', 'Pre-Production', 'Active', 'Server', 'RACK-13', 'U38', 2, '2026-08-01', 'Staging database', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023S133', 'stage-cache-01', 'HPE', 'ProLiant DL360', '192.168.7.133', '10.0.13.133', 'Ubuntu 22.04 LTS', 'DC-North', 'Building-C', '3', '302', 'IAAS', 'Pre-Production', 'Active', 'Server', 'RACK-13', 'U36', 1, '2026-08-01', 'Staging cache', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW());

-- RACK-14: Development Database (3 servers)
INSERT INTO public.servers (
    id, serial_number, hostname, brand, model, ip_address, ip_oob, operating_system,
    dc_site, dc_building, dc_floor, dc_room,
    allocation, environment, status, device_type, rack, unit, unit_height, warranty, notes, created_by, created_at, updated_at
) VALUES
(gen_random_uuid(), 'SN2023D140', 'dev-db-03', 'HPE', 'ProLiant DL380', '192.168.5.140', '10.0.14.140', 'Oracle Linux 8', 'DC-North', 'Building-C', '3', '303', 'Database', 'Development', 'Active', 'Server', 'RACK-14', 'U42', 2, '2026-08-01', 'Dev database 3', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023D141', 'dev-db-04', 'Dell', 'PowerEdge R750xd', '192.168.5.141', '10.0.14.141', 'Oracle Linux 8', 'DC-North', 'Building-C', '3', '303', 'Database', 'Development', 'Active', 'Server', 'RACK-14', 'U40', 2, '2026-08-01', 'Dev database 4', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023D142', 'dev-analytics-01', 'HPE', 'ProLiant DL380', '192.168.5.142', '10.0.14.142', 'Ubuntu 22.04 LTS', 'DC-North', 'Building-C', '3', '303', 'Database', 'Development', 'Active', 'Server', 'RACK-14', 'U38', 2, '2026-08-01', 'Dev analytics DB', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW());

-- RACK-15: Performance Testing (5 servers)
INSERT INTO public.servers (
    id, serial_number, hostname, brand, model, ip_address, ip_oob, operating_system,
    dc_site, dc_building, dc_floor, dc_room,
    allocation, environment, status, device_type, rack, unit, unit_height, warranty, notes, created_by, created_at, updated_at
) VALUES
(gen_random_uuid(), 'SN2023P150', 'perf-web-01', 'Dell', 'PowerEdge R750', '192.168.6.150', '10.0.15.150', 'Ubuntu 22.04 LTS', 'DC1', 'Building-E', '1', '104', 'IAAS', 'Testing', 'Active', 'Server', 'RACK-15', 'U42', 2, '2026-08-01', 'Perf test web', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023P151', 'perf-app-01', 'Dell', 'PowerEdge R750', '192.168.6.151', '10.0.15.151', 'Ubuntu 22.04 LTS', 'DC1', 'Building-E', '1', '104', 'IAAS', 'Testing', 'Active', 'Server', 'RACK-15', 'U40', 2, '2026-08-01', 'Perf test app', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023P152', 'perf-db-01', 'HPE', 'ProLiant DL380', '192.168.6.152', '10.0.15.152', 'RHEL 8', 'DC1', 'Building-E', '1', '104', 'Database', 'Testing', 'Active', 'Server', 'RACK-15', 'U38', 2, '2026-08-01', 'Perf test DB', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023P153', 'perf-load-01', 'Dell', 'PowerEdge R750', '192.168.6.153', '10.0.15.153', 'Ubuntu 22.04 LTS', 'DC1', 'Building-E', '1', '104', 'IAAS', 'Testing', 'Active', 'Server', 'RACK-15', 'U36', 2, '2026-08-01', 'Load generator', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023P154', 'perf-monitor-01', 'HPE', 'ProLiant DL360', '192.168.6.154', '10.0.15.154', 'Ubuntu 22.04 LTS', 'DC1', 'Building-E', '1', '104', 'IAAS', 'Testing', 'Active', 'Server', 'RACK-15', 'U34', 1, '2026-08-01', 'Perf monitoring', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW());

-- RACK-16: Research & Development (2 servers)
INSERT INTO public.servers (
    id, serial_number, hostname, brand, model, ip_address, ip_oob, operating_system,
    dc_site, dc_building, dc_floor, dc_room,
    allocation, environment, status, device_type, rack, unit, unit_height, warranty, notes, created_by, created_at, updated_at
) VALUES
(gen_random_uuid(), 'SN2023R160', 'research-01', 'Dell', 'PowerEdge R750', '192.168.5.160', '10.0.16.160', 'Ubuntu 22.04 LTS', 'DC2', 'Building-B', '4', '401', 'IAAS', 'Development', 'Active', 'Server', 'RACK-16', 'U42', 2, '2026-08-01', 'Research server 1', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023R161', 'research-02', 'HPE', 'ProLiant DL380', '192.168.5.161', '10.0.16.161', 'Other', 'DC2', 'Building-B', '4', '401', 'IAAS', 'Development', 'Active', 'Server', 'RACK-16', 'U40', 2, '2026-08-01', 'Research server 2', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW());

-- Batch 4: Storage Racks (RACK-17 through RACK-19) (7 storage devices)

-- RACK-17: Primary Storage Array (3 storage devices)
INSERT INTO public.servers (
    id, serial_number, hostname, brand, model, ip_address, ip_oob, operating_system,
    dc_site, dc_building, dc_floor, dc_room,
    allocation, environment, status, device_type, rack, unit, unit_height, warranty, notes, created_by, created_at, updated_at
) VALUES
(gen_random_uuid(), 'SN2023ST170', 'storage-primary-01', 'Dell', 'PowerVault ME4', '192.168.3.170', '10.0.17.170', 'Storage OS 2.1', 'DC-Central', 'Building-A', 'Ground', 'Storage Room', 'PAAS', 'Production', 'Active', 'Storage', 'RACK-17', 'U42', 4, '2026-08-01', 'Primary SAN array', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023ST171', 'storage-primary-02', 'NetApp', 'AFF A400', '192.168.3.171', '10.0.17.171', 'ONTAP 9.10', 'DC-Central', 'Building-A', 'Ground', 'Storage Room', 'PAAS', 'Production', 'Active', 'Storage', 'RACK-17', 'U38', 3, '2026-08-01', 'NAS primary', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023ST172', 'storage-tier2-01', 'Dell', 'PowerVault ME4', '192.168.3.172', '10.0.17.172', 'Storage OS 2.1', 'DC-Central', 'Building-A', 'Ground', 'Storage Room', 'PAAS', 'Production', 'Active', 'Storage', 'RACK-17', 'U34', 4, '2026-08-01', 'Tier 2 storage', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW());

-- RACK-18: Backup Infrastructure (2 storage devices)
INSERT INTO public.servers (
    id, serial_number, hostname, brand, model, ip_address, ip_oob, operating_system,
    dc_site, dc_building, dc_floor, dc_room,
    allocation, environment, status, device_type, rack, unit, unit_height, warranty, notes, created_by, created_at, updated_at
) VALUES
(gen_random_uuid(), 'SN2023BK180', 'backup-primary-01', 'Dell', 'PowerVault ME4', '192.168.3.180', '10.0.18.180', 'Storage OS 2.1', 'DC1', 'Building-E', 'B1', 'Storage Room', 'PAAS', 'Production', 'Active', 'Storage', 'RACK-18', 'U42', 4, '2026-08-01', 'Backup array 1', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023BK181', 'backup-compute-01', 'HPE', 'Apollo 4510', '192.168.3.181', '10.0.18.181', 'Ubuntu 22.04 LTS', 'DC1', 'Building-E', 'B1', 'Storage Room', 'PAAS', 'Production', 'Active', 'Server', 'RACK-18', 'U38', 2, '2026-08-01', 'Backup compute node', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW());

-- RACK-19: Archive Storage (2 storage devices)
INSERT INTO public.servers (
    id, serial_number, hostname, brand, model, ip_address, ip_oob, operating_system,
    dc_site, dc_building, dc_floor, dc_room,
    allocation, environment, status, device_type, rack, unit, unit_height, warranty, notes, created_by, created_at, updated_at
) VALUES
(gen_random_uuid(), 'SN2023AR190', 'archive-nas-01', 'NetApp', 'AFF A400', '192.168.3.190', '10.0.19.190', 'ONTAP 9.10', 'DC2', 'Building-B', 'B1', 'Storage Room', 'PAAS', 'Production', 'Active', 'Storage', 'RACK-19', 'U42', 3, '2026-08-01', 'Archive NAS', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023AR191', 'archive-cold-01', 'Dell', 'PowerVault ME4', '192.168.3.191', '10.0.19.191', 'Storage OS 2.1', 'DC2', 'Building-B', 'B1', 'Storage Room', 'PAAS', 'Production', 'Active', 'Storage', 'RACK-19', 'U38', 4, '2026-08-01', 'Cold storage', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW());

-- Batch 5: Network/Infrastructure Racks (RACK-20, RACK-25, RACK-30, RACK-31) (7 devices)

-- RACK-20: Core Network Equipment (3 network devices)
INSERT INTO public.servers (
    id, serial_number, hostname, brand, model, ip_address, ip_oob, operating_system,
    dc_site, dc_building, dc_floor, dc_room,
    allocation, environment, status, device_type, rack, unit, unit_height, warranty, notes, created_by, created_at, updated_at
) VALUES
(gen_random_uuid(), 'SN2023NW200', 'core-sw-02', 'Cisco', 'Nexus 93180YC-EX', '192.168.4.200', '10.0.20.200', 'NX-OS 9.3', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Network', 'RACK-20', 'U42', 1, '2026-08-01', 'Core switch 2', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023NW201', 'fw-02', 'Cisco', 'ASA 5525-X', '192.168.4.201', '10.0.20.201', 'Cisco ASA 9.16', 'DC-East', 'Building-A', '1', 'MDF', 'Load Balancer', 'Production', 'Active', 'Network', 'RACK-20', 'U41', 1, '2026-08-01', 'Firewall 2', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023NW202', 'edge-rtr-02', 'Juniper', 'MX204', '192.168.4.202', '10.0.20.202', 'JunOS 21.2', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Network', 'RACK-20', 'U40', 1, '2026-08-01', 'Edge router 2', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW());

-- RACK-25: Edge Network (2 network devices)
INSERT INTO public.servers (
    id, serial_number, hostname, brand, model, ip_address, ip_oob, operating_system,
    dc_site, dc_building, dc_floor, dc_room,
    allocation, environment, status, device_type, rack, unit, unit_height, warranty, notes, created_by, created_at, updated_at
) VALUES
(gen_random_uuid(), 'SN2023NW250', 'edge-sw-01', 'Cisco', 'Nexus 93180YC-EX', '192.168.4.250', '10.0.25.250', 'NX-OS 9.3', 'DC-West', 'Building-B', '1', 'Network Room', 'IAAS', 'Production', 'Active', 'Network', 'RACK-25', 'U42', 1, '2026-08-01', 'Edge switch', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023NW251', 'edge-fw-01', 'Cisco', 'ASA 5525-X', '192.168.4.251', '10.0.25.251', 'Cisco ASA 9.16', 'DC-West', 'Building-B', '1', 'Network Room', 'IAAS', 'Production', 'Active', 'Network', 'RACK-25', 'U41', 1, '2026-08-01', 'Edge firewall', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW());

-- RACK-30: Remote Site Infrastructure (1 server)
INSERT INTO public.servers (
    id, serial_number, hostname, brand, model, ip_address, ip_oob, operating_system,
    dc_site, dc_building, dc_floor, dc_room,
    allocation, environment, status, device_type, rack, unit, unit_height, warranty, notes, created_by, created_at, updated_at
) VALUES
(gen_random_uuid(), 'SN2023RM300', 'remote-gateway-01', 'Dell', 'PowerEdge R740', '192.168.1.300', '10.0.30.300', 'Ubuntu 22.04 LTS', 'DC3', 'Building-C', '1', 'Server Room A', 'IAAS', 'Production', 'Active', 'Server', 'RACK-30', 'U42', 2, '2026-08-01', 'Remote site gateway', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW());

-- RACK-31: Emergency/Spare Rack (1 server)
INSERT INTO public.servers (
    id, serial_number, hostname, brand, model, ip_address, ip_oob, operating_system,
    dc_site, dc_building, dc_floor, dc_room,
    allocation, environment, status, device_type, rack, unit, unit_height, warranty, notes, created_by, created_at, updated_at
) VALUES
(gen_random_uuid(), 'SN2023SP310', 'spare-server-01', 'HPE', 'ProLiant DL360', '192.168.1.310', '10.0.31.310', 'Ubuntu 22.04 LTS', 'DC4', 'Building-D', '1', 'Server Room B', 'IAAS', 'Production', 'Ready', 'Server', 'RACK-31', 'U42', 1, '2026-08-01', 'Emergency spare', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW());

-- ============================================================================
-- DC-EAST BUILDING-A FLOOR 1 MDF EXTENSION (15 RACKS, 82 SERVERS)
-- ============================================================================

-- BATCH 1: Core Production Infrastructure (RACK-32 to RACK-34) - 17 servers

-- RACK-32: Primary Web Tier (6 servers)
INSERT INTO public.servers (
    id, serial_number, hostname, brand, model, ip_address, ip_oob, operating_system,
    dc_site, dc_building, dc_floor, dc_room,
    allocation, environment, status, device_type, rack, unit, unit_height, warranty, notes, created_by, created_at, updated_at
) VALUES
(gen_random_uuid(), 'SN2023W320', 'prod-web-10', 'Dell', 'PowerEdge R750', '192.168.10.320', '10.0.32.320', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-32', 'U42', 2, '2026-08-01', 'Primary web server 10', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023W321', 'prod-web-11', 'Dell', 'PowerEdge R750', '192.168.10.321', '10.0.32.321', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-32', 'U40', 2, '2026-08-01', 'Primary web server 11', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023W322', 'prod-web-12', 'HPE', 'ProLiant DL380', '192.168.10.322', '10.0.32.322', 'Ubuntu 20.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-32', 'U38', 2, '2026-08-01', 'Primary web server 12', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023L323', 'prod-lb-03', 'HPE', 'ProLiant DL360', '192.168.10.323', '10.0.32.323', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'Load Balancer', 'Production', 'Active', 'Server', 'RACK-32', 'U36', 1, '2026-08-01', 'Load balancer 3', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023L324', 'prod-lb-04', 'HPE', 'ProLiant DL360', '192.168.10.324', '10.0.32.324', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'Load Balancer', 'Production', 'Active', 'Server', 'RACK-32', 'U35', 1, '2026-08-01', 'Load balancer 4', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023C325', 'prod-cache-03', 'Dell', 'PowerEdge R740', '192.168.10.325', '10.0.32.325', 'RHEL 8', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-32', 'U34', 2, '2026-08-01', 'Production cache server 3', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW());

-- RACK-33: Application Tier (6 servers)
INSERT INTO public.servers (
    id, serial_number, hostname, brand, model, ip_address, ip_oob, operating_system,
    dc_site, dc_building, dc_floor, dc_room,
    allocation, environment, status, device_type, rack, unit, unit_height, warranty, notes, created_by, created_at, updated_at
) VALUES
(gen_random_uuid(), 'SN2023A330', 'prod-app-10', 'Dell', 'PowerEdge R750', '192.168.10.330', '10.0.33.330', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-33', 'U42', 2, '2026-08-01', 'Primary application server 10', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023A331', 'prod-app-11', 'Dell', 'PowerEdge R750', '192.168.10.331', '10.0.33.331', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-33', 'U40', 2, '2026-08-01', 'Primary application server 11', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023A332', 'prod-api-05', 'HPE', 'ProLiant DL380', '192.168.10.332', '10.0.33.332', 'Ubuntu 20.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-33', 'U38', 2, '2026-08-01', 'API gateway server 5', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023A333', 'prod-api-06', 'HPE', 'ProLiant DL380', '192.168.10.333', '10.0.33.333', 'Ubuntu 20.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-33', 'U36', 2, '2026-08-01', 'API gateway server 6', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023Q334', 'prod-queue-01', 'Dell', 'PowerEdge R740', '192.168.10.334', '10.0.33.334', 'RHEL 8', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-33', 'U34', 2, '2026-08-01', 'Message queue server', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023M335', 'prod-mq-01', 'HPE', 'ProLiant DL360', '192.168.10.335', '10.0.33.335', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-33', 'U32', 1, '2026-08-01', 'Message broker server', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW());

-- RACK-34: Database Cluster (5 servers)
INSERT INTO public.servers (
    id, serial_number, hostname, brand, model, ip_address, ip_oob, operating_system,
    dc_site, dc_building, dc_floor, dc_room,
    allocation, environment, status, device_type, rack, unit, unit_height, warranty, notes, created_by, created_at, updated_at
) VALUES
(gen_random_uuid(), 'SN2023D340', 'prod-db-10', 'HPE', 'ProLiant DL380', '192.168.10.340', '10.0.34.340', 'Oracle Linux 8', 'DC-East', 'Building-A', '1', 'MDF', 'Database', 'Production', 'Active', 'Server', 'RACK-34', 'U42', 2, '2026-08-01', 'Primary database server 10', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023D341', 'prod-db-11', 'HPE', 'ProLiant DL380', '192.168.10.341', '10.0.34.341', 'Oracle Linux 8', 'DC-East', 'Building-A', '1', 'MDF', 'Database', 'Production', 'Active', 'Server', 'RACK-34', 'U40', 2, '2026-08-01', 'Primary database server 11', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023D342', 'prod-db-12', 'Dell', 'PowerEdge R750xd', '192.168.10.342', '10.0.34.342', 'Oracle Linux 8', 'DC-East', 'Building-A', '1', 'MDF', 'Database', 'Production', 'Active', 'Server', 'RACK-34', 'U38', 2, '2026-08-01', 'Primary database server 12', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023R343', 'prod-db-read-03', 'HPE', 'ProLiant DL380', '192.168.10.343', '10.0.34.343', 'RHEL 8', 'DC-East', 'Building-A', '1', 'MDF', 'Database', 'Production', 'Active', 'Server', 'RACK-34', 'U36', 2, '2026-08-01', 'Read replica database 3', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023B344', 'prod-db-analytics-02', 'Dell', 'PowerEdge R750xd', '192.168.10.344', '10.0.34.344', 'Oracle Linux 8', 'DC-East', 'Building-A', '1', 'MDF', 'Database', 'Production', 'Active', 'Server', 'RACK-34', 'U34', 2, '2026-08-01', 'Analytics database server 2', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW());

-- PHASE 1 EXPANSION: Additional High-Density Servers for RACK-32 to RACK-34 (+21 servers)

-- RACK-32: Additional Web Tier Expansion (+7 servers)
INSERT INTO public.servers (
    id, serial_number, hostname, brand, model, ip_address, ip_oob, operating_system,
    dc_site, dc_building, dc_floor, dc_room,
    allocation, environment, status, device_type, rack, unit, unit_height, warranty, notes, created_by, created_at, updated_at
) VALUES
(gen_random_uuid(), 'SN2023W350', 'prod-web-13', 'Dell', 'PowerEdge R750', '192.168.11.350', '10.0.32.350', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-32', 'U32', 2, '2026-08-01', 'Primary web server 13', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023W351', 'prod-web-14', 'HPE', 'ProLiant DL380', '192.168.11.351', '10.0.32.351', 'Ubuntu 20.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-32', 'U30', 2, '2026-08-01', 'Primary web server 14', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023L352', 'prod-lb-05', 'HPE', 'ProLiant DL360', '192.168.11.352', '10.0.32.352', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'Load Balancer', 'Production', 'Active', 'Server', 'RACK-32', 'U28', 1, '2026-08-01', 'Load balancer 5', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023L353', 'prod-lb-06', 'Dell', 'PowerEdge R740', '192.168.11.353', '10.0.32.353', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'Load Balancer', 'Production', 'Active', 'Server', 'RACK-32', 'U26', 2, '2026-08-01', 'Load balancer 6', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023C354', 'prod-cache-04', 'HPE', 'ProLiant DL380', '192.168.11.354', '10.0.32.354', 'RHEL 8', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-32', 'U24', 2, '2026-08-01', 'Production cache server 4', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023CDN355', 'prod-cdn-01', 'Dell', 'PowerEdge R750', '192.168.11.355', '10.0.32.355', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-32', 'U22', 2, '2026-08-01', 'CDN edge server 1', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023E356', 'prod-edge-01', 'HPE', 'ProLiant DL360', '192.168.11.356', '10.0.32.356', 'Ubuntu 20.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-32', 'U20', 1, '2026-08-01', 'Edge computing server 1', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW());

-- RACK-33: Additional Application Services (+7 servers)
INSERT INTO public.servers (
    id, serial_number, hostname, brand, model, ip_address, ip_oob, operating_system,
    dc_site, dc_building, dc_floor, dc_room,
    allocation, environment, status, device_type, rack, unit, unit_height, warranty, notes, created_by, created_at, updated_at
) VALUES
(gen_random_uuid(), 'SN2023A360', 'prod-app-12', 'Dell', 'PowerEdge R750', '192.168.11.360', '10.0.33.360', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-33', 'U30', 2, '2026-08-01', 'Primary app server 12', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023A361', 'prod-app-13', 'HPE', 'ProLiant DL380', '192.168.11.361', '10.0.33.361', 'Ubuntu 20.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-33', 'U28', 2, '2026-08-01', 'Primary app server 13', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023API362', 'prod-api-07', 'Dell', 'PowerEdge R740', '192.168.11.362', '10.0.33.362', 'Ubuntu 20.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'PAAS', 'Production', 'Active', 'Server', 'RACK-33', 'U26', 2, '2026-08-01', 'API gateway server 7', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023API363', 'prod-api-08', 'HPE', 'ProLiant DL360', '192.168.11.363', '10.0.33.363', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'PAAS', 'Production', 'Active', 'Server', 'RACK-33', 'U24', 1, '2026-08-01', 'API gateway server 8', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023Q364', 'prod-queue-02', 'Dell', 'PowerEdge R750', '192.168.11.364', '10.0.33.364', 'RHEL 8', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-33', 'U22', 2, '2026-08-01', 'Message queue server 2', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023MQ365', 'prod-mq-02', 'HPE', 'ProLiant DL380', '192.168.11.365', '10.0.33.365', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-33', 'U20', 2, '2026-08-01', 'Message broker server 2', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023W366', 'prod-worker-01', 'Dell', 'PowerEdge R740', '192.168.11.366', '10.0.33.366', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-33', 'U18', 2, '2026-08-01', 'Background worker server 1', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW());

-- RACK-34: Additional Database Infrastructure (+7 servers)
INSERT INTO public.servers (
    id, serial_number, hostname, brand, model, ip_address, ip_oob, operating_system,
    dc_site, dc_building, dc_floor, dc_room,
    allocation, environment, status, device_type, rack, unit, unit_height, warranty, notes, created_by, created_at, updated_at
) VALUES
(gen_random_uuid(), 'SN2023D370', 'prod-db-13', 'HPE', 'ProLiant DL380', '192.168.11.370', '10.0.34.370', 'Oracle Linux 8', 'DC-East', 'Building-A', '1', 'MDF', 'Database', 'Production', 'Active', 'Server', 'RACK-34', 'U32', 2, '2026-08-01', 'Primary database server 13', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023D371', 'prod-db-14', 'Dell', 'PowerEdge R750xd', '192.168.11.371', '10.0.34.371', 'Oracle Linux 8', 'DC-East', 'Building-A', '1', 'MDF', 'Database', 'Production', 'Active', 'Server', 'RACK-34', 'U30', 2, '2026-08-01', 'Primary database server 14', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023R372', 'prod-db-read-04', 'HPE', 'ProLiant DL380', '192.168.11.372', '10.0.34.372', 'RHEL 8', 'DC-East', 'Building-A', '1', 'MDF', 'Database', 'Production', 'Active', 'Server', 'RACK-34', 'U28', 2, '2026-08-01', 'Read replica database 4', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023R373', 'prod-db-read-05', 'Dell', 'PowerEdge R750', '192.168.11.373', '10.0.34.373', 'Oracle Linux 8', 'DC-East', 'Building-A', '1', 'MDF', 'Database', 'Production', 'Active', 'Server', 'RACK-34', 'U26', 2, '2026-08-01', 'Read replica database 5', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023C374', 'prod-db-cache-01', 'HPE', 'ProLiant DL360', '192.168.11.374', '10.0.34.374', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'Database', 'Production', 'Active', 'Server', 'RACK-34', 'U24', 1, '2026-08-01', 'Database cache server 1', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023B375', 'prod-db-backup-01', 'Dell', 'PowerEdge R740', '192.168.11.375', '10.0.34.375', 'RHEL 8', 'DC-East', 'Building-A', '1', 'MDF', 'Database', 'Production', 'Active', 'Server', 'RACK-34', 'U22', 2, '2026-08-01', 'Database backup server 1', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023E376', 'prod-db-etl-01', 'HPE', 'ProLiant DL380', '192.168.11.376', '10.0.34.376', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'Database', 'Production', 'Active', 'Server', 'RACK-34', 'U20', 2, '2026-08-01', 'ETL processing server 1', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW());

-- BATCH 2: Storage & Development Infrastructure (RACK-35 to RACK-37) - 15 servers

-- RACK-34: Storage & Backup (5 servers)
INSERT INTO public.servers (
    id, serial_number, hostname, brand, model, ip_address, ip_oob, operating_system,
    dc_site, dc_building, dc_floor, dc_room,
    allocation, environment, status, device_type, rack, unit, unit_height, warranty, notes, created_by, created_at, updated_at
) VALUES
(gen_random_uuid(), 'SN2023S350', 'prod-storage-05', 'NetApp', 'AFF A400', '192.168.10.350', '10.0.35.350', 'ONTAP 9.10', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Storage', 'RACK-34', 'U1', 2, '2026-08-01', 'Primary storage array 5', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023B351', 'prod-backup-03', 'Dell', 'PowerVault ME4', '192.168.10.351', '10.0.35.351', 'Storage OS 2.1', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Storage', 'RACK-34', 'U3', 2, '2026-08-01', 'Backup storage array 3', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023B352', 'prod-backup-04', 'Dell', 'PowerVault ME4', '192.168.10.352', '10.0.35.352', 'Storage OS 2.1', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Storage', 'RACK-34', 'U5', 2, '2026-08-01', 'Backup storage array 4', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023N353', 'prod-nas-02', 'HPE', 'ProLiant DL380', '192.168.10.353', '10.0.35.353', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-34', 'U7', 2, '2026-08-01', 'Network attached storage 2', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023R354', 'prod-archive-01', 'Dell', 'PowerEdge R750xd', '192.168.10.354', '10.0.35.354', 'RHEL 8', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-34', 'U9', 2, '2026-08-01', 'Archive storage server', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW());

-- RACK-36: Network Infrastructure (4 servers)
INSERT INTO public.servers (
    id, serial_number, hostname, brand, model, ip_address, ip_oob, operating_system,
    dc_site, dc_building, dc_floor, dc_room,
    allocation, environment, status, device_type, rack, unit, unit_height, warranty, notes, created_by, created_at, updated_at
) VALUES
(gen_random_uuid(), 'SN2023F360', 'prod-fw-03', 'Cisco', 'ASA 5525-X', '192.168.10.360', '10.0.36.360', 'Cisco ASA 9.16', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Network', 'RACK-36', 'U42', 1, '2026-08-01', 'Production firewall 3', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023W361', 'prod-sw-05', 'Cisco', 'Nexus 93180YC-EX', '192.168.10.361', '10.0.36.361', 'NX-OS 9.3', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Network', 'RACK-36', 'U41', 1, '2026-08-01', 'Core switch 5', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023W362', 'prod-sw-06', 'Cisco', 'Nexus 93180YC-EX', '192.168.10.362', '10.0.36.362', 'NX-OS 9.3', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Network', 'RACK-36', 'U40', 1, '2026-08-01', 'Core switch 6', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023T363', 'prod-rtr-03', 'Juniper', 'MX204', '192.168.10.363', '10.0.36.363', 'JunOS 21.2', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Network', 'RACK-36', 'U39', 2, '2026-08-01', 'Core router 3', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW());

-- RACK-37: Development Environment (6 servers)
INSERT INTO public.servers (
    id, serial_number, hostname, brand, model, ip_address, ip_oob, operating_system,
    dc_site, dc_building, dc_floor, dc_room,
    allocation, environment, status, device_type, rack, unit, unit_height, warranty, notes, created_by, created_at, updated_at
) VALUES
(gen_random_uuid(), 'SN2023V370', 'dev-web-10', 'Dell', 'PowerEdge R740', '192.168.10.370', '10.0.37.370', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Development', 'Active', 'Server', 'RACK-37', 'U42', 2, '2026-08-01', 'Development web server 10', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023V371', 'dev-app-10', 'Dell', 'PowerEdge R740', '192.168.10.371', '10.0.37.371', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Development', 'Active', 'Server', 'RACK-37', 'U40', 2, '2026-08-01', 'Development app server 10', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023V372', 'dev-db-10', 'HPE', 'ProLiant DL360', '192.168.10.372', '10.0.37.372', 'Ubuntu 20.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'Database', 'Development', 'Active', 'Server', 'RACK-37', 'U38', 1, '2026-08-01', 'Development database 10', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023V373', 'dev-cache-05', 'HPE', 'ProLiant DL360', '192.168.10.373', '10.0.37.373', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Development', 'Active', 'Server', 'RACK-37', 'U37', 1, '2026-08-01', 'Development cache server 5', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023V374', 'dev-api-05', 'Dell', 'PowerEdge R740', '192.168.10.374', '10.0.37.374', 'Ubuntu 20.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Development', 'Active', 'Server', 'RACK-37', 'U36', 2, '2026-08-01', 'Development API server 5', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023V375', 'dev-tools-05', 'HPE', 'ProLiant DL360', '192.168.10.375', '10.0.37.375', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Development', 'Active', 'Server', 'RACK-37', 'U35', 1, '2026-08-01', 'Development tools server 5', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW());

-- PHASE 2 EXPANSION: Additional High-Density Servers for RACK-35 to RACK-37 (+20 servers)

-- RACK-35: Additional Storage & Archive (+7 servers)
INSERT INTO public.servers (
    id, serial_number, hostname, brand, model, ip_address, ip_oob, operating_system,
    dc_site, dc_building, dc_floor, dc_room,
    allocation, environment, status, device_type, rack, unit, unit_height, warranty, notes, created_by, created_at, updated_at
) VALUES
(gen_random_uuid(), 'SN2023S380', 'prod-storage-06', 'NetApp', 'AFF A400', '192.168.11.380', '10.0.35.380', 'ONTAP 9.10', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Storage', 'RACK-35', 'U32', 2, '2026-08-01', 'Primary storage array 6', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023S381', 'prod-backup-05', 'Dell', 'PowerVault ME4', '192.168.11.381', '10.0.35.381', 'Storage OS 2.1', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Storage', 'RACK-35', 'U30', 2, '2026-08-01', 'Backup storage system 5', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023S382', 'prod-backup-06', 'HPE', 'ProLiant DL380', '192.168.11.382', '10.0.35.382', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-34', 'U17', 2, '2026-08-01', 'Backup server 6', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023N383', 'prod-nas-03', 'Dell', 'PowerEdge R750xd', '192.168.11.383', '10.0.35.383', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-34', 'U15', 2, '2026-08-01', 'NAS server 3', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023A384', 'prod-archive-02', 'HPE', 'ProLiant DL380', '192.168.11.384', '10.0.35.384', 'RHEL 8', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-34', 'U13', 2, '2026-08-01', 'Archive server 2', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023SY385', 'prod-sync-01', 'Dell', 'PowerEdge R740', '192.168.11.385', '10.0.35.385', 'Ubuntu 20.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-34', 'U11', 2, '2026-08-01', 'Data sync server 1', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023F386', 'prod-ftp-01', 'HPE', 'ProLiant DL360', '192.168.11.386', '10.0.35.386', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-34', 'U25', 1, '2026-08-01', 'FTP server 1', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW());

-- RACK-36: Additional Network & Security (+8 servers)
INSERT INTO public.servers (
    id, serial_number, hostname, brand, model, ip_address, ip_oob, operating_system,
    dc_site, dc_building, dc_floor, dc_room,
    allocation, environment, status, device_type, rack, unit, unit_height, warranty, notes, created_by, created_at, updated_at
) VALUES
(gen_random_uuid(), 'SN2023FW390', 'prod-fw-04', 'Cisco', 'ASA 5525-X', '192.168.11.390', '10.0.36.390', 'Cisco ASA 9.16', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Network', 'RACK-37', 'U39', 1, '2026-08-01', 'Firewall appliance 4', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023SW391', 'prod-sw-07', 'Cisco', 'Nexus 93180YC-EX', '192.168.11.391', '10.0.36.391', 'NX-OS 9.3', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Network', 'RACK-36', 'U35', 1, '2026-08-01', 'Core switch 7', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023SW392', 'prod-sw-08', 'Cisco', 'Nexus 93180YC-EX', '192.168.11.392', '10.0.36.392', 'NX-OS 9.3', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Network', 'RACK-36', 'U33', 1, '2026-08-01', 'Core switch 8', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023R393', 'prod-rtr-04', 'Juniper', 'MX204', '192.168.11.393', '10.0.36.393', 'JunOS 21.2', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Network', 'RACK-37', 'U28', 1, '2026-08-01', 'Core router 4', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023P394', 'prod-proxy-01', 'Dell', 'PowerEdge R740', '192.168.11.394', '10.0.36.394', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-36', 'U29', 2, '2026-08-01', 'Proxy server 1', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023V395', 'prod-vpn-01', 'HPE', 'ProLiant DL360', '192.168.11.395', '10.0.36.395', 'Ubuntu 20.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-34', 'U19', 1, '2026-08-01', 'VPN server 1', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023DNS396', 'prod-dns-01', 'Dell', 'PowerEdge R750', '192.168.11.396', '10.0.36.396', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-36', 'U25', 2, '2026-08-01', 'DNS server 1', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023DHCP397', 'prod-dhcp-01', 'HPE', 'ProLiant DL380', '192.168.11.397', '10.0.36.397', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-36', 'U23', 2, '2026-08-01', 'DHCP server 1', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW());

-- RACK-37: Additional Development Infrastructure (+6 servers)
INSERT INTO public.servers (
    id, serial_number, hostname, brand, model, ip_address, ip_oob, operating_system,
    dc_site, dc_building, dc_floor, dc_room,
    allocation, environment, status, device_type, rack, unit, unit_height, warranty, notes, created_by, created_at, updated_at
) VALUES
(gen_random_uuid(), 'SN2023V400', 'dev-web-11', 'Dell', 'PowerEdge R740', '192.168.11.400', '10.0.37.400', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Development', 'Active', 'Server', 'RACK-37', 'U33', 2, '2026-08-01', 'Development web server 11', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023V401', 'dev-app-11', 'HPE', 'ProLiant DL380', '192.168.11.401', '10.0.37.401', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Development', 'Active', 'Server', 'RACK-37', 'U31', 2, '2026-08-01', 'Development app server 11', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023V402', 'dev-db-11', 'Dell', 'PowerEdge R750', '192.168.11.402', '10.0.37.402', 'Ubuntu 20.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'Database', 'Development', 'Active', 'Server', 'RACK-37', 'U29', 2, '2026-08-01', 'Development database 11', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023V403', 'dev-cache-06', 'HPE', 'ProLiant DL360', '192.168.11.403', '10.0.37.403', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Development', 'Active', 'Server', 'RACK-37', 'U27', 1, '2026-08-01', 'Development cache server 6', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023V404', 'dev-api-06', 'Dell', 'PowerEdge R740', '192.168.11.404', '10.0.37.404', 'Ubuntu 20.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Development', 'Active', 'Server', 'RACK-37', 'U25', 2, '2026-08-01', 'Development API server 6', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023V405', 'dev-tools-06', 'HPE', 'ProLiant DL380', '192.168.11.405', '10.0.37.405', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Development', 'Active', 'Server', 'RACK-37', 'U23', 2, '2026-08-01', 'Development tools server 6', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW());

-- BATCH 3: Testing & CI/CD Infrastructure (RACK-38 to RACK-40) - 16 servers

-- RACK-38: Testing Infrastructure (5 servers)
INSERT INTO public.servers (
    id, serial_number, hostname, brand, model, ip_address, ip_oob, operating_system,
    dc_site, dc_building, dc_floor, dc_room,
    allocation, environment, status, device_type, rack, unit, unit_height, warranty, notes, created_by, created_at, updated_at
) VALUES
(gen_random_uuid(), 'SN2023T380', 'test-web-10', 'Dell', 'PowerEdge R740', '192.168.10.380', '10.0.38.380', 'Ubuntu 20.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Testing', 'Active', 'Server', 'RACK-38', 'U42', 2, '2026-08-01', 'Testing web server 10', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023T381', 'test-app-10', 'HPE', 'ProLiant DL360', '192.168.10.381', '10.0.38.381', 'Ubuntu 20.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Testing', 'Active', 'Server', 'RACK-38', 'U40', 1, '2026-08-01', 'Testing app server 10', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023T382', 'test-db-05', 'HPE', 'ProLiant DL380', '192.168.10.382', '10.0.38.382', 'RHEL 8', 'DC-East', 'Building-A', '1', 'MDF', 'Database', 'Testing', 'Active', 'Server', 'RACK-38', 'U38', 2, '2026-08-01', 'Testing database server 5', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023T383', 'test-load-05', 'Dell', 'PowerEdge R750', '192.168.10.383', '10.0.38.383', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Testing', 'Active', 'Server', 'RACK-38', 'U36', 2, '2026-08-01', 'Load testing server 5', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023T384', 'test-perf-05', 'HPE', 'ProLiant DL360', '192.168.10.384', '10.0.38.384', 'Windows Server 2022', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Testing', 'Active', 'Server', 'RACK-38', 'U34', 1, '2026-08-01', 'Performance testing server 5', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW());

-- RACK-39: Pre-Production (6 servers)
INSERT INTO public.servers (
    id, serial_number, hostname, brand, model, ip_address, ip_oob, operating_system,
    dc_site, dc_building, dc_floor, dc_room,
    allocation, environment, status, device_type, rack, unit, unit_height, warranty, notes, created_by, created_at, updated_at
) VALUES
(gen_random_uuid(), 'SN2023P390', 'preprod-web-10', 'Dell', 'PowerEdge R740', '192.168.10.390', '10.0.39.390', 'Ubuntu 20.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Pre-Production', 'Active', 'Server', 'RACK-39', 'U42', 2, '2026-08-01', 'PreProd web server 10', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023P391', 'preprod-app-10', 'Dell', 'PowerEdge R740', '192.168.10.391', '10.0.39.391', 'Ubuntu 20.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Pre-Production', 'Active', 'Server', 'RACK-39', 'U40', 2, '2026-08-01', 'PreProd app server 10', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023P392', 'preprod-db-10', 'HPE', 'ProLiant DL380', '192.168.10.392', '10.0.39.392', 'RHEL 8', 'DC-East', 'Building-A', '1', 'MDF', 'Database', 'Pre-Production', 'Active', 'Server', 'RACK-39', 'U38', 2, '2026-08-01', 'PreProd database 10', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023P393', 'preprod-api-10', 'HPE', 'ProLiant DL360', '192.168.10.393', '10.0.39.393', 'Ubuntu 20.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Pre-Production', 'Active', 'Server', 'RACK-39', 'U36', 1, '2026-08-01', 'PreProd API server 10', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023P394', 'preprod-cache-05', 'HPE', 'ProLiant DL360', '192.168.10.394', '10.0.39.394', 'Windows Server 2019', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Pre-Production', 'Active', 'Server', 'RACK-39', 'U35', 1, '2026-08-01', 'PreProd cache server 5', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023P395', 'preprod-lb-02', 'Dell', 'PowerEdge R750', '192.168.10.395', '10.0.39.395', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'Load Balancer', 'Pre-Production', 'Active', 'Server', 'RACK-39', 'U34', 2, '2026-08-01', 'PreProd load balancer 2', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW());

-- RACK-40: CI/CD & DevOps (5 servers)
INSERT INTO public.servers (
    id, serial_number, hostname, brand, model, ip_address, ip_oob, operating_system,
    dc_site, dc_building, dc_floor, dc_room,
    allocation, environment, status, device_type, rack, unit, unit_height, warranty, notes, created_by, created_at, updated_at
) VALUES
(gen_random_uuid(), 'SN2023C400', 'cicd-jenkins-01', 'Dell', 'PowerEdge R750', '192.168.10.400', '10.0.40.400', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-37', 'U1', 2, '2026-08-01', 'Jenkins CI/CD server', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023C401', 'cicd-gitlab-01', 'HPE', 'ProLiant DL380', '192.168.10.401', '10.0.40.401', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-37', 'U3', 2, '2026-08-01', 'GitLab repository server', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023C402', 'cicd-runner-01', 'Dell', 'PowerEdge R740', '192.168.10.402', '10.0.40.402', 'Ubuntu 20.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-37', 'U5', 2, '2026-08-01', 'CI/CD runner server 1', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023C403', 'cicd-runner-02', 'Dell', 'PowerEdge R740', '192.168.10.403', '10.0.40.403', 'Ubuntu 20.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-37', 'U7', 2, '2026-08-01', 'CI/CD runner server 2', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW());

-- PHASE 3 EXPANSION: Additional High-Density Servers for RACK-38 to RACK-40 (+19 servers)

-- RACK-38: Additional Testing Capacity (+7 servers)
INSERT INTO public.servers (
    id, serial_number, hostname, brand, model, ip_address, ip_oob, operating_system,
    dc_site, dc_building, dc_floor, dc_room,
    allocation, environment, status, device_type, rack, unit, unit_height, warranty, notes, created_by, created_at, updated_at
) VALUES
(gen_random_uuid(), 'SN2023T410', 'test-web-11', 'Dell', 'PowerEdge R740', '192.168.11.410', '10.0.38.410', 'Ubuntu 20.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Testing', 'Active', 'Server', 'RACK-38', 'U32', 2, '2026-08-01', 'Testing web server 11', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023T411', 'test-app-11', 'HPE', 'ProLiant DL360', '192.168.11.411', '10.0.38.411', 'Ubuntu 20.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Testing', 'Active', 'Server', 'RACK-38', 'U30', 1, '2026-08-01', 'Testing app server 11', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023T412', 'test-db-06', 'Dell', 'PowerEdge R750', '192.168.11.412', '10.0.38.412', 'RHEL 8', 'DC-East', 'Building-A', '1', 'MDF', 'Database', 'Testing', 'Active', 'Server', 'RACK-38', 'U28', 2, '2026-08-01', 'Testing database 6', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023T413', 'test-load-06', 'HPE', 'ProLiant DL380', '192.168.11.413', '10.0.38.413', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Testing', 'Active', 'Server', 'RACK-38', 'U26', 2, '2026-08-01', 'Load testing server 6', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023T414', 'test-perf-06', 'Dell', 'PowerEdge R740', '192.168.11.414', '10.0.38.414', 'Windows Server 2022', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Testing', 'Active', 'Server', 'RACK-38', 'U24', 2, '2026-08-01', 'Performance testing server 6', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023T415', 'test-security-01', 'HPE', 'ProLiant DL360', '192.168.11.415', '10.0.38.415', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Testing', 'Active', 'Server', 'RACK-38', 'U22', 1, '2026-08-01', 'Security testing server 1', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023T416', 'test-mobile-01', 'Dell', 'PowerEdge R750', '192.168.11.416', '10.0.38.416', 'Ubuntu 20.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Testing', 'Active', 'Server', 'RACK-38', 'U20', 2, '2026-08-01', 'Mobile testing server 1', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW());

-- RACK-39: Additional Pre-Production Services (+6 servers)
INSERT INTO public.servers (
    id, serial_number, hostname, brand, model, ip_address, ip_oob, operating_system,
    dc_site, dc_building, dc_floor, dc_room,
    allocation, environment, status, device_type, rack, unit, unit_height, warranty, notes, created_by, created_at, updated_at
) VALUES
(gen_random_uuid(), 'SN2023P420', 'preprod-web-11', 'Dell', 'PowerEdge R740', '192.168.11.420', '10.0.39.420', 'Ubuntu 20.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Pre-Production', 'Active', 'Server', 'RACK-39', 'U32', 2, '2026-08-01', 'PreProd web server 11', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023P421', 'preprod-app-11', 'HPE', 'ProLiant DL380', '192.168.11.421', '10.0.39.421', 'Ubuntu 20.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Pre-Production', 'Active', 'Server', 'RACK-39', 'U30', 2, '2026-08-01', 'PreProd app server 11', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023P422', 'preprod-db-11', 'Dell', 'PowerEdge R750', '192.168.11.422', '10.0.39.422', 'RHEL 8', 'DC-East', 'Building-A', '1', 'MDF', 'Database', 'Pre-Production', 'Active', 'Server', 'RACK-39', 'U28', 2, '2026-08-01', 'PreProd database 11', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023P423', 'preprod-api-11', 'HPE', 'ProLiant DL360', '192.168.11.423', '10.0.39.423', 'Ubuntu 20.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'PAAS', 'Pre-Production', 'Active', 'Server', 'RACK-39', 'U26', 1, '2026-08-01', 'PreProd API server 11', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023P424', 'preprod-cache-06', 'Dell', 'PowerEdge R740', '192.168.11.424', '10.0.39.424', 'Windows Server 2019', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Pre-Production', 'Active', 'Server', 'RACK-39', 'U24', 2, '2026-08-01', 'PreProd cache server 6', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023P425', 'preprod-lb-03', 'HPE', 'ProLiant DL380', '192.168.11.425', '10.0.39.425', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'Load Balancer', 'Pre-Production', 'Active', 'Server', 'RACK-39', 'U22', 2, '2026-08-01', 'PreProd load balancer 3', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW());

-- RACK-40: Additional CI/CD Infrastructure (+7 servers)
INSERT INTO public.servers (
    id, serial_number, hostname, brand, model, ip_address, ip_oob, operating_system,
    dc_site, dc_building, dc_floor, dc_room,
    allocation, environment, status, device_type, rack, unit, unit_height, warranty, notes, created_by, created_at, updated_at
) VALUES
(gen_random_uuid(), 'SN2023C430', 'cicd-jenkins-02', 'Dell', 'PowerEdge R750', '192.168.11.430', '10.0.40.430', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-40', 'U32', 2, '2026-08-01', 'Jenkins CI/CD server 2', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023C431', 'cicd-gitlab-02', 'HPE', 'ProLiant DL380', '192.168.11.431', '10.0.40.431', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-40', 'U30', 2, '2026-08-01', 'GitLab repository server 2', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023C432', 'cicd-runner-03', 'Dell', 'PowerEdge R740', '192.168.11.432', '10.0.40.432', 'Ubuntu 20.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-40', 'U28', 2, '2026-08-01', 'CI/CD runner server 3', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023C433', 'cicd-runner-04', 'HPE', 'ProLiant DL360', '192.168.11.433', '10.0.40.433', 'Ubuntu 20.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-40', 'U26', 1, '2026-08-01', 'CI/CD runner server 4', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023C434', 'cicd-artifacts-02', 'Dell', 'PowerEdge R750', '192.168.11.434', '10.0.40.434', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-40', 'U24', 2, '2026-08-01', 'Artifacts repository server 2', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023C435', 'cicd-sonar-01', 'HPE', 'ProLiant DL380', '192.168.11.435', '10.0.40.435', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-40', 'U22', 2, '2026-08-01', 'SonarQube server 1', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023C436', 'cicd-nexus-01', 'Dell', 'PowerEdge R740', '192.168.11.436', '10.0.40.436', 'Ubuntu 20.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-40', 'U20', 2, '2026-08-01', 'Nexus repository server 1', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW());

-- BATCH 4: Containers & Big Data Infrastructure (RACK-41 to RACK-43) - 16 servers

-- RACK-41: Container Platform Extension (6 servers)
INSERT INTO public.servers (
    id, serial_number, hostname, brand, model, ip_address, ip_oob, operating_system,
    dc_site, dc_building, dc_floor, dc_room,
    allocation, environment, status, device_type, rack, unit, unit_height, warranty, notes, created_by, created_at, updated_at
) VALUES
(gen_random_uuid(), 'SN2023K410', 'k8s-master-10', 'Dell', 'PowerEdge R750', '192.168.10.410', '10.0.41.410', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'PAAS', 'Production', 'Active', 'Server', 'RACK-41', 'U42', 2, '2026-08-01', 'Kubernetes master node 10', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023K411', 'k8s-master-11', 'Dell', 'PowerEdge R750', '192.168.10.411', '10.0.41.411', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'PAAS', 'Production', 'Active', 'Server', 'RACK-41', 'U40', 2, '2026-08-01', 'Kubernetes master node 11', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023K412', 'k8s-worker-10', 'HPE', 'Apollo 4510', '192.168.10.412', '10.0.41.412', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'PAAS', 'Production', 'Active', 'Server', 'RACK-41', 'U38', 2, '2026-08-01', 'Kubernetes worker node 10', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023K413', 'k8s-worker-11', 'HPE', 'Apollo 4510', '192.168.10.413', '10.0.41.413', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'PAAS', 'Production', 'Active', 'Server', 'RACK-41', 'U36', 2, '2026-08-01', 'Kubernetes worker node 11', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023K414', 'k8s-worker-12', 'HPE', 'Apollo 4510', '192.168.10.414', '10.0.41.414', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'PAAS', 'Production', 'Active', 'Server', 'RACK-41', 'U34', 2, '2026-08-01', 'Kubernetes worker node 12', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023K415', 'k8s-storage-05', 'Dell', 'PowerEdge R750', '192.168.10.415', '10.0.41.415', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'PAAS', 'Production', 'Active', 'Server', 'RACK-41', 'U32', 2, '2026-08-01', 'Kubernetes storage node 5', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW());

-- RACK-42: AI/ML Infrastructure (5 servers)
INSERT INTO public.servers (
    id, serial_number, hostname, brand, model, ip_address, ip_oob, operating_system,
    dc_site, dc_building, dc_floor, dc_room,
    allocation, environment, status, device_type, rack, unit, unit_height, warranty, notes, created_by, created_at, updated_at
) VALUES
(gen_random_uuid(), 'SN2023I420', 'ai-gpu-01', 'Dell', 'PowerEdge R750', '192.168.10.420', '10.0.42.420', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-42', 'U42', 2, '2026-08-01', 'AI GPU server 1', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023I421', 'ai-gpu-02', 'Dell', 'PowerEdge R750', '192.168.10.421', '10.0.42.421', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-42', 'U40', 2, '2026-08-01', 'AI GPU server 2', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023I422', 'ai-data-01', 'HPE', 'ProLiant DL380', '192.168.10.422', '10.0.42.422', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-42', 'U38', 2, '2026-08-01', 'AI data processing server', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023I423', 'ai-training-01', 'Dell', 'PowerEdge R750xd', '192.168.10.423', '10.0.42.423', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-42', 'U36', 2, '2026-08-01', 'AI training server', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023I424', 'ai-inference-01', 'HPE', 'ProLiant DL360', '192.168.10.424', '10.0.42.424', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-42', 'U34', 1, '2026-08-01', 'AI inference server', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW());

-- RACK-43: Big Data & Analytics (5 servers)
INSERT INTO public.servers (
    id, serial_number, hostname, brand, model, ip_address, ip_oob, operating_system,
    dc_site, dc_building, dc_floor, dc_room,
    allocation, environment, status, device_type, rack, unit, unit_height, warranty, notes, created_by, created_at, updated_at
) VALUES
(gen_random_uuid(), 'SN2023G430', 'bigdata-hdfs-01', 'Dell', 'PowerEdge R750xd', '192.168.10.430', '10.0.43.430', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-43', 'U42', 2, '2026-08-01', 'Big data HDFS server 1', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023G431', 'bigdata-hdfs-02', 'Dell', 'PowerEdge R750xd', '192.168.10.431', '10.0.43.431', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-43', 'U40', 2, '2026-08-01', 'Big data HDFS server 2', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023G432', 'bigdata-spark-01', 'HPE', 'ProLiant DL380', '192.168.10.432', '10.0.43.432', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-43', 'U38', 2, '2026-08-01', 'Apache Spark server', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023G433', 'bigdata-kafka-01', 'Dell', 'PowerEdge R740', '192.168.10.433', '10.0.43.433', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-43', 'U36', 2, '2026-08-01', 'Apache Kafka server', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023G434', 'bigdata-elastic-01', 'HPE', 'ProLiant DL380', '192.168.10.434', '10.0.43.434', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-43', 'U34', 2, '2026-08-01', 'Elasticsearch server', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),

-- ✅ PHASE 4: Additional Server Deployment (RACK-41 to RACK-43) - 20 servers
-- Part of the expanded 100-server plan implementation

-- RACK-41: Container Platform Extension (7 servers)
(gen_random_uuid(), 'SN2023H440', 'k8s-worker-21', 'Dell', 'PowerEdge R750', '192.168.11.440', '10.0.41.440', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-41', 'U42', 2, '2026-08-01', 'Kubernetes worker node 21', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023H441', 'k8s-worker-22', 'HPE', 'ProLiant DL380', '192.168.11.441', '10.0.41.441', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-41', 'U40', 2, '2026-08-01', 'Kubernetes worker node 22', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023H442', 'k8s-worker-23', 'Dell', 'PowerEdge R740', '192.168.11.442', '10.0.41.442', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-41', 'U38', 2, '2026-08-01', 'Kubernetes worker node 23', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023H443', 'istio-mesh-01', 'HPE', 'ProLiant DL360', '192.168.11.443', '10.0.41.443', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-41', 'U36', 1, '2026-08-01', 'Istio service mesh node 1', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023H444', 'istio-mesh-02', 'Dell', 'PowerEdge R750', '192.168.11.444', '10.0.41.444', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-41', 'U34', 2, '2026-08-01', 'Istio service mesh node 2', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023H445', 'harbor-registry-01', 'HPE', 'ProLiant DL380', '192.168.11.445', '10.0.41.445', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-41', 'U32', 2, '2026-08-01', 'Harbor container registry 1', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023H446', 'harbor-registry-02', 'Dell', 'PowerEdge R740', '192.168.11.446', '10.0.41.446', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-41', 'U30', 2, '2026-08-01', 'Harbor container registry 2', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),

-- RACK-42: AI/ML Infrastructure (7 servers)
(gen_random_uuid(), 'SN2023I450', 'ml-training-01', 'Dell', 'PowerEdge R750', '192.168.11.450', '10.0.42.450', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-42', 'U42', 2, '2026-08-01', 'ML training server 1', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023I451', 'ml-training-02', 'HPE', 'ProLiant DL380', '192.168.11.451', '10.0.42.451', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-42', 'U40', 2, '2026-08-01', 'ML training server 2', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023I452', 'ml-inference-01', 'Dell', 'PowerEdge R750', '192.168.11.452', '10.0.42.452', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-42', 'U38', 2, '2026-08-01', 'ML inference server 1', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023I453', 'ml-inference-02', 'HPE', 'ProLiant DL360', '192.168.11.453', '10.0.42.453', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-42', 'U36', 1, '2026-08-01', 'ML inference server 2', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023I454', 'jupyter-hub-01', 'Dell', 'PowerEdge R740', '192.168.11.454', '10.0.42.454', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-42', 'U34', 2, '2026-08-01', 'JupyterHub server 1', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023I455', 'mlflow-tracking-01', 'HPE', 'ProLiant DL380', '192.168.11.455', '10.0.42.455', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-42', 'U32', 2, '2026-08-01', 'MLflow tracking server 1', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023I456', 'airflow-scheduler-01', 'Dell', 'PowerEdge R750', '192.168.11.456', '10.0.42.456', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-42', 'U30', 2, '2026-08-01', 'Airflow scheduler server 1', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),

-- RACK-43: Big Data & Analytics (6 servers)
(gen_random_uuid(), 'SN2023J460', 'hadoop-datanode-07', 'Dell', 'PowerEdge R750', '192.168.11.460', '10.0.43.460', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-43', 'U28', 2, '2026-08-01', 'Hadoop data node 7', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023J461', 'hadoop-datanode-08', 'HPE', 'ProLiant DL380', '192.168.11.461', '10.0.43.461', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-43', 'U26', 2, '2026-08-01', 'Hadoop data node 8', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023J462', 'spark-worker-07', 'Dell', 'PowerEdge R740', '192.168.11.462', '10.0.43.462', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-43', 'U24', 2, '2026-08-01', 'Spark worker node 7', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023J463', 'spark-worker-08', 'HPE', 'ProLiant DL360', '192.168.11.463', '10.0.43.463', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-43', 'U22', 1, '2026-08-01', 'Spark worker node 8', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023J464', 'kafka-broker-04', 'Dell', 'PowerEdge R750', '192.168.11.464', '10.0.43.464', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-43', 'U20', 2, '2026-08-01', 'Kafka broker 4', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023J465', 'elastic-data-04', 'HPE', 'ProLiant DL380', '192.168.11.465', '10.0.43.465', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-43', 'U18', 2, '2026-08-01', 'Elasticsearch data node 4', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),

-- ✅ PHASE 5: Final Additional Server Deployment (RACK-44 to RACK-46) - 20 servers
-- Completing the expanded 100-server plan implementation

-- RACK-44: Security & Compliance Extension (7 servers)
(gen_random_uuid(), 'SN2023K470', 'sec-firewall-05', 'Dell', 'PowerEdge R750', '192.168.11.470', '10.0.44.470', 'RHEL 8', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-44', 'U28', 2, '2026-08-01', 'Security firewall 5', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023K471', 'sec-proxy-03', 'HPE', 'ProLiant DL380', '192.168.11.471', '10.0.44.471', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-44', 'U26', 2, '2026-08-01', 'Security proxy server 3', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023K472', 'sec-scanner-02', 'Dell', 'PowerEdge R740', '192.168.11.472', '10.0.44.472', 'RHEL 8', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-44', 'U24', 2, '2026-08-01', 'Security vulnerability scanner 2', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023K473', 'sec-audit-02', 'HPE', 'ProLiant DL360', '192.168.11.473', '10.0.44.473', 'Windows Server 2022', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-44', 'U22', 1, '2026-08-01', 'Security audit server 2', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023K474', 'sec-threat-intel-01', 'Dell', 'PowerEdge R750', '192.168.11.474', '10.0.44.474', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-44', 'U20', 2, '2026-08-01', 'Threat intelligence server 1', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023K475', 'sec-soar-01', 'HPE', 'ProLiant DL380', '192.168.11.475', '10.0.44.475', 'RHEL 8', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-44', 'U18', 2, '2026-08-01', 'Security orchestration server 1', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023K476', 'sec-deception-01', 'Dell', 'PowerEdge R740', '192.168.11.476', '10.0.44.476', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-44', 'U16', 2, '2026-08-01', 'Security deception platform 1', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),

-- RACK-45: Monitoring & Observability Extension (7 servers)
(gen_random_uuid(), 'SN2023L480', 'monitor-prometheus-03', 'Dell', 'PowerEdge R750', '192.168.11.480', '10.0.45.480', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-45', 'U42', 2, '2026-08-01', 'Prometheus monitoring 3', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023L481', 'monitor-grafana-03', 'HPE', 'ProLiant DL380', '192.168.11.481', '10.0.45.481', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-45', 'U40', 2, '2026-08-01', 'Grafana dashboard 3', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023L482', 'monitor-elastic-03', 'Dell', 'PowerEdge R740', '192.168.11.482', '10.0.45.482', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-45', 'U38', 2, '2026-08-01', 'Elasticsearch monitoring 3', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023L483', 'monitor-kibana-03', 'HPE', 'ProLiant DL360', '192.168.11.483', '10.0.45.483', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-45', 'U36', 1, '2026-08-01', 'Kibana visualization 3', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023L484', 'monitor-jaeger-02', 'Dell', 'PowerEdge R750', '192.168.11.484', '10.0.45.484', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-45', 'U34', 2, '2026-08-01', 'Jaeger tracing server 2', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023L485', 'monitor-alert-manager-02', 'HPE', 'ProLiant DL380', '192.168.11.485', '10.0.45.485', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-45', 'U32', 2, '2026-08-01', 'Alert manager server 2', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023L486', 'monitor-loki-02', 'Dell', 'PowerEdge R740', '192.168.11.486', '10.0.45.486', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-45', 'U30', 2, '2026-08-01', 'Loki log aggregation 2', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),

-- RACK-46: Disaster Recovery & Backup Extension (6 servers)
(gen_random_uuid(), 'SN2023M490', 'dr-replica-db-03', 'Dell', 'PowerEdge R750', '192.168.11.490', '10.0.46.490', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-46', 'U42', 2, '2026-08-01', 'DR database replica 3', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023M491', 'dr-backup-storage-03', 'HPE', 'ProLiant DL380', '192.168.11.491', '10.0.46.491', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-46', 'U40', 2, '2026-08-01', 'DR backup storage 3', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023M492', 'dr-orchestrator-02', 'Dell', 'PowerEdge R740', '192.168.11.492', '10.0.46.492', 'RHEL 8', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-46', 'U38', 2, '2026-08-01', 'DR orchestration server 2', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023M493', 'dr-sync-server-02', 'HPE', 'ProLiant DL360', '192.168.11.493', '10.0.46.493', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-46', 'U36', 1, '2026-08-01', 'DR sync server 2', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023M494', 'backup-dedup-02', 'Dell', 'PowerEdge R750', '192.168.11.494', '10.0.46.494', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-46', 'U34', 2, '2026-08-01', 'Backup deduplication 2', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023M495', 'backup-archive-02', 'HPE', 'ProLiant DL380', '192.168.11.495', '10.0.46.495', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-46', 'U32', 2, '2026-08-01', 'Backup archive server 2', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW());

-- BATCH 5: Security & DR Infrastructure (RACK-44 to RACK-46) - 15 servers

-- RACK-44: Security & Compliance (4 servers)
INSERT INTO public.servers (
    id, serial_number, hostname, brand, model, ip_address, ip_oob, operating_system,
    dc_site, dc_building, dc_floor, dc_room,
    allocation, environment, status, device_type, rack, unit, unit_height, warranty, notes, created_by, created_at, updated_at
) VALUES
(gen_random_uuid(), 'SN2023E440', 'sec-siem-01', 'Dell', 'PowerEdge R750', '192.168.10.440', '10.0.44.440', 'RHEL 8', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-44', 'U42', 2, '2026-08-01', 'Security SIEM server', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023E441', 'sec-ids-01', 'HPE', 'ProLiant DL380', '192.168.10.441', '10.0.44.441', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-44', 'U40', 2, '2026-08-01', 'Intrusion detection server', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023E442', 'sec-vault-01', 'Dell', 'PowerEdge R740', '192.168.10.442', '10.0.44.442', 'RHEL 8', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-44', 'U38', 2, '2026-08-01', 'Security vault server', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023E443', 'sec-compliance-01', 'HPE', 'ProLiant DL360', '192.168.10.443', '10.0.44.443', 'Windows Server 2022', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-44', 'U36', 1, '2026-08-01', 'Compliance monitoring server', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW());

-- RACK-45: Monitoring & Observability (6 servers)
INSERT INTO public.servers (
    id, serial_number, hostname, brand, model, ip_address, ip_oob, operating_system,
    dc_site, dc_building, dc_floor, dc_room,
    allocation, environment, status, device_type, rack, unit, unit_height, warranty, notes, created_by, created_at, updated_at
) VALUES
(gen_random_uuid(), 'SN2023O450', 'monitor-prometheus-02', 'Dell', 'PowerEdge R750', '192.168.10.450', '10.0.45.450', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-45', 'U42', 2, '2026-08-01', 'Prometheus monitoring server 2', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023O451', 'monitor-grafana-02', 'HPE', 'ProLiant DL360', '192.168.10.451', '10.0.45.451', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-45', 'U40', 1, '2026-08-01', 'Grafana dashboard server 2', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023O452', 'monitor-elk-02', 'Dell', 'PowerEdge R750', '192.168.10.452', '10.0.45.452', 'RHEL 8', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-45', 'U38', 2, '2026-08-01', 'ELK stack server 2', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023O453', 'monitor-jaeger-01', 'HPE', 'ProLiant DL360', '192.168.10.453', '10.0.45.453', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-45', 'U36', 1, '2026-08-01', 'Jaeger tracing server', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023O454', 'monitor-alerting-02', 'HPE', 'ProLiant DL360', '192.168.10.454', '10.0.45.454', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-45', 'U35', 1, '2026-08-01', 'Alert manager server 2', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023O455', 'monitor-metrics-01', 'Dell', 'PowerEdge R740', '192.168.10.455', '10.0.45.455', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-45', 'U34', 2, '2026-08-01', 'Metrics collection server', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW());

-- RACK-46: Disaster Recovery & Backup (5 servers)
INSERT INTO public.servers (
    id, serial_number, hostname, brand, model, ip_address, ip_oob, operating_system,
    dc_site, dc_building, dc_floor, dc_room,
    allocation, environment, status, device_type, rack, unit, unit_height, warranty, notes, created_by, created_at, updated_at
) VALUES
(gen_random_uuid(), 'SN2023R460', 'dr-replica-01', 'Dell', 'PowerEdge R750', '192.168.10.460', '10.0.46.460', 'Oracle Linux 8', 'DC-East', 'Building-A', '1', 'MDF', 'Database', 'Production', 'Active', 'Server', 'RACK-46', 'U42', 2, '2026-08-01', 'DR database replica 1', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023R461', 'dr-replica-02', 'HPE', 'ProLiant DL380', '192.168.10.461', '10.0.46.461', 'Oracle Linux 8', 'DC-East', 'Building-A', '1', 'MDF', 'Database', 'Production', 'Active', 'Server', 'RACK-46', 'U40', 2, '2026-08-01', 'DR database replica 2', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023R462', 'dr-backup-05', 'Dell', 'PowerVault ME4', '192.168.10.462', '10.0.46.462', 'Storage OS 2.1', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Storage', 'RACK-46', 'U38', 2, '2026-08-01', 'DR backup storage 5', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023R463', 'dr-sync-01', 'HPE', 'ProLiant DL360', '192.168.10.463', '10.0.46.463', 'Ubuntu 22.04 LTS', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-46', 'U36', 1, '2026-08-01', 'DR synchronization server', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW()),
(gen_random_uuid(), 'SN2023R464', 'dr-restore-01', 'Dell', 'PowerEdge R740', '192.168.10.464', '10.0.46.464', 'RHEL 8', 'DC-East', 'Building-A', '1', 'MDF', 'IAAS', 'Production', 'Active', 'Server', 'RACK-46', 'U34', 2, '2026-08-01', 'DR restore server', (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), NOW(), NOW());


-- END DC-EAST EXTENSION DUMMY DATA (82 new servers across 15 racks)
-- END DUMMY DATA SECTION
-- ============================================================================

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
      WHEN enum_record.typname = 'floor_type' THEN 'floors'
      WHEN enum_record.typname = 'room_type' THEN 'rooms'
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

-- ============================================================================
-- DATABASE FUNCTIONS FOR RACK/HIERARCHY OPERATIONS
-- ============================================================================

-- Function to get the first available rack from rack_metadata
CREATE OR REPLACE FUNCTION public.get_default_rack()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    default_rack TEXT;
BEGIN
    SELECT rack_name INTO default_rack
    FROM public.rack_metadata
    ORDER BY rack_name
    LIMIT 1;
    
    RETURN COALESCE(default_rack, 'RACK-01');
END;
$$;

-- Function to get rack location from rack_metadata
CREATE OR REPLACE FUNCTION public.get_rack_location(p_rack_name TEXT)
RETURNS TABLE(
    dc_site public.site_type,
    dc_building public.building_type,
    dc_floor public.floor_type,
    dc_room public.room_type
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        rm.dc_site,
        rm.dc_building,
        rm.dc_floor,
        rm.dc_room
    FROM public.rack_metadata rm
    WHERE rm.rack_name = p_rack_name;
    
    -- If no result found, raise exception
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Rack % not found in rack_metadata table', p_rack_name;
    END IF;
END;
$$;

-- Function to get all available racks
CREATE OR REPLACE FUNCTION public.get_all_racks()
RETURNS TABLE(
    rack_name public.rack_type,
    dc_site public.site_type,
    dc_building public.building_type,
    dc_floor public.floor_type,
    dc_room public.room_type,
    description TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        rm.rack_name,
        rm.dc_site,
        rm.dc_building,
        rm.dc_floor,
        rm.dc_room,
        rm.description
    FROM public.rack_metadata rm
    ORDER BY rm.rack_name;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_default_rack() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_rack_location(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_racks() TO authenticated;