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
    brand TEXT,
    model TEXT,
    ip_address TEXT,
    ip_oob TEXT,
    operating_system TEXT,
    dc_site TEXT NOT NULL,
    dc_building TEXT,
    dc_floor TEXT,
    dc_room TEXT,
    allocation public.allocation_type,
    status TEXT DEFAULT 'Active'::text,
    device_type public.device_type NOT NULL,
    warranty TEXT,
    notes TEXT,
    environment public.environment_type,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================================================
-- 3. SAMPLE DATA
-- ============================================================================

-- Insert sample server records
INSERT INTO public.servers (
  id, serial_number, hostname, brand, model, ip_address, ip_oob, operating_system,
  dc_site, dc_building, dc_floor, dc_room,
  allocation, environment, status, device_type, warranty, notes, created_by, created_at, updated_at
) VALUES
-- Production Web Servers
(gen_random_uuid(), 'SN12345678', 'web-prod-01', 'Dell', 'PowerEdge R740', '192.168.1.10', '10.0.0.1', 'Ubuntu 22.04 LTS',
 'DC-East', 'Building-A', '1', '101',
 'IAAS', 'Production', 'Active', 'Server', '3 Years, Expires 2025-12-31', 'Primary web server', 
 (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), now(), now()),

(gen_random_uuid(), 'SN12345679', 'web-prod-02', 'Dell', 'PowerEdge R740', '192.168.1.11', '10.0.0.2', 'Ubuntu 22.04 LTS',
 'DC-East', 'Building-A', '1', '101',
 'IAAS', 'Production', 'Active', 'Server', '3 Years, Expires 2025-12-31', 'Secondary web server',
 (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), now(), now()),

-- Database Servers
(gen_random_uuid(), 'SN23456789', 'db-primary-01', 'HPE', 'ProLiant DL380', '192.168.1.20', '10.0.0.3', 'Oracle Linux 8',
 'DC-East', 'Building-A', '1', '102',
 'Database', 'Production', 'Active', 'Server', '5 Years, Expires 2027-06-30', 'Primary database server',
 (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), now(), now()),

(gen_random_uuid(), 'SN23456780', 'db-replica-01', 'HPE', 'ProLiant DL380', '192.168.1.21', '10.0.0.4', 'Oracle Linux 8',
 'DC-East', 'Building-A', '1', '102',
 'Database', 'Production', 'Active', 'Server', '5 Years, Expires 2027-06-30', 'Database replica',
 (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), now(), now()),

-- Storage
(gen_random_uuid(), 'SN34567890', 'storage-01', 'Dell', 'PowerVault ME4', '192.168.1.30', '10.0.0.5', 'Storage OS 2.1',
 'DC-West', 'Building-B', '2', '201',
 'PAAS', 'Production', 'Active', 'Storage', '5 Years, Expires 2026-09-30', 'Primary storage array',
 (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), now(), now()),

-- Network Equipment
(gen_random_uuid(), 'SN45678901', 'fw-01', 'Cisco', 'ASA 5525-X', '192.168.1.40', '10.0.0.6', 'Cisco ASA 9.16',
 'DC-East', 'Building-A', '1', '103',
 'Load Balancer', 'Production', 'Active', 'Network', '3 Years, Expires 2025-03-31', 'Main firewall',
 (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), now(), now()),

-- Development Servers
(gen_random_uuid(), 'SN56789012', 'dev-app-01', 'Dell', 'PowerEdge R640', '192.168.1.50', '10.0.0.7', 'CentOS 7',
 'DC-Central', 'Building-C', '3', '301',
 'IAAS', 'Development', 'Active', 'Server', '1 Year, Expires 2024-12-31', 'Development app server',
 (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), now(), now()),

-- Testing Environment
(gen_random_uuid(), 'SN67890123', 'test-db-01', 'HPE', 'ProLiant DL360', '192.168.2.10', '10.0.0.8', 'PostgreSQL 14',
 'DC-South', 'Building-D', '1', '105',
 'Database', 'Testing', 'Active', 'Server', '2 Years, Expires 2025-06-30', 'Test database server',
 (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), now(), now()),

-- Pre-Production
(gen_random_uuid(), 'SN78901234', 'stage-web-01', 'Dell', 'PowerEdge R740', '192.168.3.10', '10.0.0.9', 'Ubuntu 20.04 LTS',
 'DC-North', 'Building-E', '2', '205',
 'IAAS', 'Pre-Production', 'Active', 'Server', '2 Years, Expires 2024-12-31', 'Staging web server',
 (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), now(), now()),

-- Backup Storage
(gen_random_uuid(), 'SN89012345', 'backup-stor-01', 'Dell', 'PowerVault ME4', '192.168.1.60', '10.0.0.10', 'Storage OS 2.1',
 'DC-West', 'Building-B', '2', '202',
 'PAAS', 'Production', 'Active', 'Storage', '5 Years, Expires 2026-09-30', 'Backup storage array',
 (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), now(), now()),

-- Additional Application Servers
(gen_random_uuid(), 'SN90123456', 'app-prod-01', 'Dell', 'PowerEdge R750', '192.168.4.10', '10.0.1.11', 'RHEL 8',
 'DC-East', 'Building-A', '2', '201',
 'IAAS', 'Production', 'Active', 'Server', '3 Years, Expires 2025-12-31', 'Primary application server',
 (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), now(), now()),

(gen_random_uuid(), 'SN90123457', 'app-dev-01', 'HPE', 'ProLiant DL360', '192.168.5.10', '10.0.2.11', 'Ubuntu 22.04 LTS',
 'DC-Central', 'Building-C', '2', '302',
 'IAAS', 'Development', 'Active', 'Server', '2 Years, Expires 2024-12-31', 'Development environment server',
 (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), now(), now()),

-- Additional Database Servers
(gen_random_uuid(), 'SN90123458', 'db-mysql-01', 'Dell', 'PowerEdge R740xd', '192.168.6.10', '10.0.3.11', 'MySQL 8.0',
 'DC-West', 'Building-B', '1', '102',
 'Database', 'Production', 'Active', 'Server', '4 Years, Expires 2026-06-30', 'MySQL database server',
 (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), now(), now()),

(gen_random_uuid(), 'SN90123459', 'db-mongodb-01', 'HPE', 'Apollo 4510', '192.168.6.11', '10.0.3.12', 'MongoDB 6.0',
 'DC-West', 'Building-B', '1', '103',
 'Database', 'Production', 'Active', 'Server', '4 Years, Expires 2026-06-30', 'MongoDB NoSQL server',
 (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), now(), now()),

-- Network Devices
(gen_random_uuid(), 'SN90123460', 'core-sw-01', 'Cisco', 'Nexus 93180YC-EX', '192.168.7.10', '10.0.4.11', 'NX-OS 9.3',
 'DC-East', 'Building-A', '1', 'MDF',
 'IAAS', 'Production', 'Active', 'Network', '5 Years, Expires 2027-01-31', 'Core network switch A',
 (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), now(), now()),

(gen_random_uuid(), 'SN90123461', 'edge-rtr-01', 'Juniper', 'MX204', '192.168.7.11', '10.0.4.12', 'JunOS 21.2',
 'DC-East', 'Building-A', '1', 'MDF',
 'IAAS', 'Production', 'Active', 'Network', '5 Years, Expires 2027-01-31', 'Edge router for internet connectivity',
 (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), now(), now()),

-- Additional Storage
(gen_random_uuid(), 'SN90123462', 'nas-archive-01', 'NetApp', 'AFF A400', '192.168.8.10', '10.0.5.11', 'ONTAP 9.10',
 'DC-North', 'Building-D', '1', '301',
 'PAAS', 'Production', 'Active', 'Storage', '5 Years, Expires 2027-03-31', 'High-performance NAS for archive',
 (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), now(), now()),

-- Monitoring and Management
(gen_random_uuid(), 'SN90123463', 'mon-01', 'Dell', 'PowerEdge R6515', '192.168.9.10', '10.0.6.11', 'CentOS 8',
 'DC-Central', 'Building-C', '1', '101',
 'IAAS', 'Production', 'Active', 'Server', '3 Years, Expires 2025-09-30', 'Primary monitoring server',
 (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), now(), now()),

-- Additional Test Environment
(gen_random_uuid(), 'SN90123464', 'test-app-01', 'HPE', 'ProLiant DL380', '192.168.10.10', '10.0.7.11', 'Windows Server 2022',
 'DC-South', 'Building-D', '2', '201',
 'IAAS', 'Testing', 'Active', 'Server', '2 Years, Expires 2024-12-31', 'Windows application test server',
 (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), now(), now()),

-- Additional Staging Environment
(gen_random_uuid(), 'SN90123465', 'stage-db-01', 'Dell', 'PowerEdge R740', '192.168.11.10', '10.0.8.11', 'PostgreSQL 14',
 'DC-North', 'Building-E', '2', '206',
 'Database', 'Pre-Production', 'Active', 'Server', '3 Years, Expires 2025-12-31', 'Pre-Production database server',
 (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), now(), now()),

-- Additional Backup Servers
(gen_random_uuid(), 'SN90123466', 'backup-01', 'HPE', 'ProLiant DL380', '192.168.12.10', '10.0.9.11', 'RHEL 8',
 'DC-West', 'Building-B', '2', '203',
 'IAAS', 'Production', 'Active', 'Server', '4 Years, Expires 2026-06-30', 'Primary backup server',
 (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), now(), now()),

-- Additional Development Servers
(gen_random_uuid(), 'SN90123467', 'dev-db-01', 'Dell', 'PowerEdge R640', '192.168.13.10', '10.1.0.11', 'MySQL 8.0',
 'DC-Central', 'Building-C', '3', '303',
 'Database', 'Development', 'Active', 'Server', '2 Years, Expires 2024-12-31', 'Development database server',
 (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), now(), now()),

-- Additional Network Security
(gen_random_uuid(), 'SN90123468', 'ids-01', 'Palo Alto', 'PA-3220', '192.168.14.10', '10.1.1.11', 'PAN-OS 10.2',
 'DC-East', 'Building-A', '1', '104',
 'IAAS', 'Production', 'Active', 'Network', '5 Years, Expires 2027-05-31', 'Intrusion detection system',
 (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), now(), now()),

-- Additional Storage for Development
(gen_random_uuid(), 'SN90123469', 'dev-stor-01', 'Dell', 'PowerVault ME4024', '192.168.15.10', '10.1.2.11', 'Storage OS 2.1',
 'DC-Central', 'Building-C', '3', '304',
 'PAAS', 'Development', 'Active', 'Storage', '3 Years, Expires 2025-12-31', 'Development storage array',
 (SELECT id FROM auth.users WHERE email = 'admin@localhost.com' LIMIT 1), now(), now()),

-- Additional Load Balancer
(gen_random_uuid(), 'SN90123470', 'lb-02', 'F5', 'BIG-IP 1600', '192.168.16.10', '10.1.3.11', 'BIG-IP 16.1',
 'DC-East', 'Building-A', '1', '105',
 'Load Balancer', 'Production', 'Active', 'Network', '5 Years, Expires 2027-02-28', 'Secondary load balancer',
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