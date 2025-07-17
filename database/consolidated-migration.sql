-- Datacenter Server Inventory - Complete Database Setup
-- This file contains all necessary tables, functions, policies, and initial data
-- for the Datacenter Server Inventory application

-- ============================================================================
-- 1. ENUMS AND TYPES
-- ============================================================================

-- User roles for role-based access control
CREATE TYPE public.user_role AS ENUM ('super_admin', 'engineer', 'viewer');

-- Server device types
CREATE TYPE public.device_type AS ENUM ('Server', 'Storage', 'Network');

-- Server allocation types
CREATE TYPE public.allocation_type AS ENUM ('IAAS/PAAS', 'SAAS', 'Load Balancer', 'Database');

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
    hostname TEXT NOT NULL,
    device_type public.device_type NOT NULL,
    dc_site TEXT NOT NULL,
    dc_building TEXT,
    dc_floor TEXT,
    dc_room TEXT,
    ip_address TEXT,
    serial_number TEXT,
    manufacturer TEXT,
    model TEXT,
    status TEXT DEFAULT 'Active'::text,
    allocation public.allocation_type,
    environment public.environment_type,
    specifications JSONB,
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================================================
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
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