
-- First, let's clean up any potential issues and recreate the default super admin user
-- Delete any existing conflicting data first
DELETE FROM public.user_roles WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'admin@local');
DELETE FROM public.profiles WHERE id IN (SELECT id FROM auth.users WHERE email = 'admin@local');
DELETE FROM auth.users WHERE email = 'admin@local';

-- Insert default super admin user with proper conflict handling
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@local',
  crypt('admin', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"username": "admin", "full_name": "System Administrator"}',
  false,
  '',
  '',
  '',
  ''
);

-- Insert profile for the super admin user
INSERT INTO public.profiles (id, username, full_name)
SELECT id, 'admin', 'System Administrator'
FROM auth.users 
WHERE email = 'admin@local';

-- Assign super_admin role to the default admin user
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'super_admin'::user_role
FROM auth.users 
WHERE email = 'admin@local';
