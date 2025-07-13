-- Create function to create default admin user
CREATE OR REPLACE FUNCTION public.create_default_admin()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_user_id uuid;
  admin_email text := 'admin@localhost.com';
  admin_username text := 'admin';
  admin_password text := 'admin';
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
    INSERT INTO public.profiles (id, username, full_name)
    VALUES (admin_user_id, admin_username, 'System Administrator')
    ON CONFLICT (id) DO NOTHING;
    
    -- Set admin role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (admin_user_id, 'super_admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RAISE NOTICE 'Default admin user created successfully with email: %', admin_email;
  ELSE
    RAISE NOTICE 'Default admin user already exists';
  END IF;
END;
$$;

-- Execute the function to create the default admin user
SELECT public.create_default_admin();

-- Create a trigger to run this function on database startup/reset if needed
-- Note: This is for documentation - the function above will run once during migration