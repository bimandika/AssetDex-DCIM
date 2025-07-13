-- Fix admin user role - remove duplicate viewer role and ensure only super_admin
DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Get admin user ID
  SELECT au.id INTO admin_user_id 
  FROM auth.users au 
  WHERE au.email = 'admin@localhost.com';
  
  IF admin_user_id IS NOT NULL THEN
    -- Remove viewer role for admin user
    DELETE FROM public.user_roles 
    WHERE user_id = admin_user_id AND role = 'viewer';
    
    -- Ensure super_admin role exists (in case it got deleted)
    INSERT INTO public.user_roles (user_id, role)
    VALUES (admin_user_id, 'super_admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Update profile with proper full name if missing
    UPDATE public.profiles 
    SET full_name = 'System Administrator'
    WHERE id = admin_user_id AND (full_name IS NULL OR full_name = '');
    
    RAISE NOTICE 'Admin user role fixed successfully';
  ELSE
    RAISE NOTICE 'Admin user not found';
  END IF;
END;
$$;