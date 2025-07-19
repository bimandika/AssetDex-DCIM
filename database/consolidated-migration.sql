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

-- Drop existing type if it has different values
DROP TYPE IF EXISTS public.allocation_type CASCADE;
CREATE TYPE public.allocation_type AS ENUM ('IAAS', 'PAAS', 'SAAS', 'Load Balancer', 'Database');

-- Environment types
CREATE TYPE public.environment_type AS ENUM ('Production', 'Testing', 'Pre-Production', 'Development');

-- Server status types
CREATE TYPE public.server_status AS ENUM ('Active', 'Ready' ,'Inactive', 'Maintenance', 'Decommissioned', 'Retired');

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
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

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
    rack TEXT,
    unit TEXT,
    warranty DATE,
    notes TEXT,
    environment public.environment_type,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT valid_warranty CHECK (warranty IS NULL OR warranty >= CURRENT_DATE)
);

-- ============================================================================
-- 3. SAMPLE DATA
-- ============================================================================
-- Insert 25 sample server records with valid enum values
INSERT INTO public.servers (
  id, serial_number, hostname, brand, model, ip_address, ip_oob, operating_system,
  dc_site, dc_building, dc_floor, dc_room,
  allocation, environment, status, device_type, rack, unit, warranty, notes, created_by, created_at, updated_at
) VALUES
-- Production Web Servers (1-3)
(gen_random_uuid(), 'SN2023W001', 'web-prod-01', 'Dell', 'PowerEdge R740', '192.168.1.10', '10.0.0.1', 'Ubuntu 22.04 LTS',
 'DC-East', 'Building-A', '1', '101',
 'IAAS', 'Production', 'Active', 'Server', 'RACK-01', 'U42', '2025-12-31', 'Primary web server',
 (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), now(), now()),

(gen_random_uuid(), 'SN2023W002', 'web-prod-02', 'Dell', 'PowerEdge R740', '192.168.1.11', '10.0.0.2', 'Ubuntu 22.04 LTS',
 'DC-East', 'Building-A', '1', '101',
 'IAAS', 'Production', 'Active', 'Server', 'RACK-01', 'U43', '2025-12-31', 'Secondary web server',
 (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), now(), now()),

(gen_random_uuid(), 'SN2023W003', 'web-prod-03', 'Dell', 'PowerEdge R750', '192.168.1.12', '10.0.0.3', 'Ubuntu 22.04 LTS',
 'DC-East', 'Building-A', '1', '101',
 'IAAS', 'Production', 'Active', 'Server', 'RACK-01', 'U44', '2025-12-31', 'Tertiary web server',
 (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), now(), now()),

-- Database Servers (4-6)
(gen_random_uuid(), 'SN2023D001', 'db-primary-01', 'HPE', 'ProLiant DL380', '192.168.2.10', '10.0.0.4', 'Oracle Linux 8',
 'DC-East', 'Building-A', '1', '102',
 'Database', 'Production', 'Active', 'Server', 'RACK-02', 'U20', '2026-06-30', 'Primary database server',
 (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), now(), now()),

(gen_random_uuid(), 'SN2023D002', 'db-replica-01', 'HPE', 'ProLiant DL380', '192.168.2.11', '10.0.0.5', 'Oracle Linux 8',
 'DC-East', 'Building-A', '1', '102',
 'Database', 'Production', 'Active', 'Server', 'RACK-02', 'U21', '2026-06-30', 'Database replica 1',
 (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), now(), now()),

(gen_random_uuid(), 'SN2023D003', 'db-backup-01', 'Dell', 'PowerEdge R750', '192.168.2.12', '10.0.0.6', 'RHEL 8',
 'DC-West', 'Building-B', '1', '201',
 'Database', 'Production', 'Active', 'Server', 'RACK-10', 'U15', '2026-06-30', 'Backup database server',
 (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), now(), now()),

-- Storage (7-9)
(gen_random_uuid(), 'SN2023S001', 'storage-01', 'Dell', 'PowerVault ME4', '192.168.3.10', '10.0.0.7', 'Storage OS 2.1',
 'DC-West', 'Building-B', '2', '201',
 'PAAS', 'Production', 'Active', 'Storage', 'RACK-11', 'U10', '2026-09-30', 'Primary storage array',
 (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), now(), now()),

(gen_random_uuid(), 'SN2023S002', 'nas-archive-01', 'NetApp', 'AFF A400', '192.168.3.11', '10.0.0.8', 'ONTAP 9.10',
 'DC-North', 'Building-D', '1', '301',
 'PAAS', 'Production', 'Active', 'Storage', 'RACK-15', 'U15', '2027-03-31', 'High-performance NAS',
 (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), now(), now()),

(gen_random_uuid(), 'SN2023S003', 'backup-stor-01', 'Dell', 'PowerVault ME4', '192.168.3.12', '10.0.0.9', 'Storage OS 2.1',
 'DC-South', 'Building-E', '1', '401',
 'PAAS', 'Production', 'Active', 'Storage', 'RACK-20', 'U20', '2026-12-31', 'Backup storage array',
 (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), now(), now()),

-- Network Devices (10-12)
(gen_random_uuid(), 'SN2023N001', 'core-sw-01', 'Cisco', 'Nexus 93180YC-EX', '192.168.4.10', '10.0.0.10', 'NX-OS 9.3',
 'DC-East', 'Building-A', '1', 'MDF',
 'IAAS', 'Production', 'Active', 'Network', 'RACK-01', 'U1', '2026-09-30', 'Core switch 1',
 (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), now(), now()),

(gen_random_uuid(), 'SN2023N002', 'fw-01', 'Cisco', 'ASA 5525-X', '192.168.4.11', '10.0.0.11', 'Cisco ASA 9.16',
 'DC-East', 'Building-A', '1', 'MDF',
 'Load Balancer', 'Production', 'Active', 'Network', 'RACK-01', 'U2', '2027-01-31', 'Main firewall',
 (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), now(), now()),

(gen_random_uuid(), 'SN2023N003', 'edge-rtr-01', 'Juniper', 'MX204', '192.168.4.12', '10.0.0.12', 'JunOS 21.2',
 'DC-East', 'Building-A', '1', 'MDF',
 'IAAS', 'Production', 'Active', 'Network', 'RACK-01', 'U3', '2027-01-31', 'Edge router',
 (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), now(), now()),

-- Development Servers (13-15)
(gen_random_uuid(), 'SN2023D004', 'dev-app-01', 'Dell', 'PowerEdge R750', '192.168.5.10', '10.0.1.1', 'Ubuntu 22.04 LTS',
 'DC-Central', 'Building-C', '3', '301',
 'IAAS', 'Development', 'Active', 'Server', 'RACK-30', 'U15', '2025-12-31', 'Development app server',
 (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), now(), now()),

(gen_random_uuid(), 'SN2023D005', 'dev-db-01', 'Dell', 'PowerEdge R740', '192.168.5.11', '10.0.1.2', 'Oracle Linux 8',
 'DC-Central', 'Building-C', '3', '302',
 'Database', 'Development', 'Active', 'Server', 'RACK-30', 'U16', '2025-12-31', 'Development database',
 (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), now(), now()),

(gen_random_uuid(), 'SN2023D006', 'dev-web-01', 'HPE', 'ProLiant DL360', '192.168.5.12', '10.0.1.3', 'Ubuntu 22.04 LTS',
 'DC-Central', 'Building-C', '3', '303',
 'IAAS', 'Development', 'Active', 'Server', 'RACK-31', 'U10', '2025-12-31', 'Development web server',
 (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), now(), now()),

-- Testing Environment (16-18)
(gen_random_uuid(), 'SN2023T001', 'test-db-01', 'HPE', 'ProLiant DL360', '192.168.6.10', '10.0.2.1', 'Oracle Linux 8',
 'DC-South', 'Building-D', '1', '105',
 'Database', 'Testing', 'Active', 'Server', 'RACK-25', 'U10', '2026-06-30', 'Test database server',
 (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), now(), now()),

(gen_random_uuid(), 'SN2023T002', 'test-app-01', 'Dell', 'PowerEdge R740', '192.168.6.11', '10.0.2.2', 'Ubuntu 20.04 LTS',
 'DC-South', 'Building-D', '1', '105',
 'IAAS', 'Testing', 'Active', 'Server', 'RACK-25', 'U11', '2026-06-30', 'Test application server',
 (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), now(), now()),

(gen_random_uuid(), 'SN2023T003', 'test-web-01', 'HPE', 'ProLiant DL380', '192.168.6.12', '10.0.2.3', 'Ubuntu 20.04 LTS',
 'DC-South', 'Building-D', '1', '105',
 'IAAS', 'Testing', 'Active', 'Server', 'RACK-25', 'U12', '2026-06-30', 'Test web server',
 (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), now(), now()),

-- Staging Environment (19-21)
(gen_random_uuid(), 'SN2023S004', 'stage-web-01', 'Dell', 'PowerEdge R740', '192.168.7.10', '10.0.3.1', 'Ubuntu 20.04 LTS',
 'DC-North', 'Building-E', '2', '205',
 'IAAS', 'Pre-Production', 'Active', 'Server', 'RACK-20', 'U25', '2025-12-31', 'Staging web server',
 (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), now(), now()),

(gen_random_uuid(), 'SN2023S005', 'stage-db-01', 'Dell', 'PowerEdge R740', '192.168.7.11', '10.0.3.2', 'RHEL 8',
 'DC-North', 'Building-E', '2', '206',
 'Database', 'Pre-Production', 'Active', 'Server', 'RACK-20', 'U26', '2026-12-31', 'Staging database',
 (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), now(), now()),

(gen_random_uuid(), 'SN2023S006', 'stage-app-01', 'HPE', 'ProLiant DL380', '192.168.7.12', '10.0.3.3', 'RHEL 8',
 'DC-North', 'Building-E', '2', '207',
 'IAAS', 'Pre-Production', 'Active', 'Server', 'RACK-20', 'U27', '2026-12-31', 'Staging application server',
 (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), now(), now()),

-- Additional Servers (22-25)
(gen_random_uuid(), 'SN2023A001', 'monitor-01', 'Dell', 'PowerEdge R750', '192.168.8.10', '10.0.4.1', 'Ubuntu 22.04 LTS',
 'DC-East', 'Building-A', '2', '201',
 'IAAS', 'Production', 'Active', 'Server', 'RACK-05', 'U10', '2026-12-31', 'Monitoring server',
 (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), now(), now()),

(gen_random_uuid(), 'SN2023A002', 'backup-01', 'HPE', 'ProLiant DL380', '192.168.8.11', '10.0.4.2', 'Ubuntu 22.04 LTS',
 'DC-West', 'Building-B', '1', '202',
 'IAAS', 'Production', 'Active', 'Server', 'RACK-12', 'U15', '2026-12-31', 'Backup server',
 (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), now(), now()),

(gen_random_uuid(), 'SN2023A003', 'auth-01', 'Dell', 'PowerEdge R740', '192.168.8.12', '10.0.4.3', 'Ubuntu 22.04 LTS',
 'DC-East', 'Building-A', '2', '202',
 'IAAS', 'Production', 'Active', 'Server', 'RACK-05', 'U11', '2026-12-31', 'Authentication server',
 (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), now(), now()),

(gen_random_uuid(), 'SN2023A004', 'log-01', 'HPE', 'ProLiant DL360', '192.168.8.13', '10.0.4.4', 'Ubuntu 22.04 LTS',
 'DC-West', 'Building-B', '1', '203',
 'IAAS', 'Production', 'Active', 'Server', 'RACK-12', 'U16', '2026-12-31', 'Logging server',
 (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), now(), now());

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