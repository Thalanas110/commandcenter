-- ===========================================
-- Force Admin Role for [EMAIL_ADDRESS]
-- ===========================================

-- 1. Update the handle_new_user function so it works for future signups/resets
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  assigned_role public.app_role := 'user';
BEGIN
  -- Check if the email is the admin email
  IF NEW.email = 'HAHAHAHA@gmail.com' THEN
    assigned_role := 'admin';
  END IF;

  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  
  -- Insert into user_roles (Trigger will handle metadata sync)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, assigned_role);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Force update for EXISTING user
DO $$
DECLARE
  target_email TEXT := 'HAHAHAHA@gmail.com';
  target_user_id UUID;
BEGIN
  -- Find the user
  SELECT id INTO target_user_id FROM auth.users WHERE email = target_email;

  IF target_user_id IS NOT NULL THEN
    -- A. Reset roles: Remove existing roles and explicitly set 'admin'
    DELETE FROM public.user_roles WHERE user_id = target_user_id;
    INSERT INTO public.user_roles (user_id, role) VALUES (target_user_id, 'admin');

    -- B. Force update auth.users metadata 
    -- (This ensures the 'role' claim is present in the JWT after next sign in)
    UPDATE auth.users
    SET raw_app_meta_data = 
      jsonb_set(
        COALESCE(raw_app_meta_data, '{}'::jsonb),
        '{role}',
        '"admin"'
      )
    WHERE id = target_user_id;
    
    RAISE NOTICE 'User % has been promoted to admin.', target_email;
  ELSE
    RAISE NOTICE 'User % not found. User needs to sign up for this script to work.', target_email;
  END IF;
END $$;
