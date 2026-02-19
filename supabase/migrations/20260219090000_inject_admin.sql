-- Update the handle_new_user function to automatically make [EMAIL_ADDRESS] an admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  assigned_role public.app_role := 'user';
BEGIN
  -- Check if the email is the admin email
  IF NEW.email = 'HEH NO U' THEN
    assigned_role := 'admin';
  END IF;

  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  
  -- Insert the assigned role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, assigned_role);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant admin role to the user if they already exist
DO $$
DECLARE
  target_user_id UUID;
BEGIN
  SELECT id INTO target_user_id FROM auth.users WHERE email = 'HEH NO U';
  
  IF target_user_id IS NOT NULL THEN
    -- Check if the user already has the admin role. 
    -- If they have 'user' role, we add 'admin' role as well (or instead, depending on unique constraint, but schema allows unique(user_id, role) so multiple roles are possible per user if we wanted).
    -- However, the handle_new_user above sets it to *either* user or admin.
    -- Ideally an admin should have access to everything.
    -- Let's just ensure they have the admin role row.
    
    IF NOT EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = target_user_id AND role = 'admin'
    ) THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (target_user_id, 'admin');
    END IF;
  END IF;
END $$;
