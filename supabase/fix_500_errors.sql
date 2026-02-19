-- ==========================================
-- 1. Create a Trigger Function to Sync Role to Metadata
-- ==========================================
CREATE OR REPLACE FUNCTION public.sync_user_role()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE auth.users
  SET raw_app_meta_data = 
    jsonb_set(
      COALESCE(raw_app_meta_data, '{}'::jsonb),
      '{role}',
      to_jsonb(NEW.role)
    )
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 2. Create the Trigger
-- ==========================================
DROP TRIGGER IF EXISTS on_role_change ON public.user_roles;
CREATE TRIGGER on_role_change
AFTER INSERT OR UPDATE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.sync_user_role();

-- ==========================================
-- 3. Backfill Existing Users (One-time)
-- ==========================================
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT * FROM public.user_roles LOOP
    UPDATE auth.users
    SET raw_app_meta_data = 
      jsonb_set(
        COALESCE(raw_app_meta_data, '{}'::jsonb),
        '{role}',
        to_jsonb(r.role)
      )
    WHERE id = r.user_id;
  END LOOP;
END $$;

-- ==========================================
-- 4. Update handle_new_user to set metadata directly
-- ==========================================
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
  
  -- Insert into user_roles (Trigger will handle metadata sync, but we can set it via metadata explicitly if we want)
  -- Actually, the Trigger above runs AFTER insert on user_roles.
  -- user_roles insert happens here.
  -- So metadata will be updated by the trigger.
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, assigned_role);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ==========================================
-- 5. Update has_role to use JWT Metadata (BREAKS RECURSION)
-- ==========================================
-- This function now checks the JWT instead of querying user_roles.
-- This stops the infinite loop in RLS policies.
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  -- Check if the user's metadata contains the role
  SELECT (auth.jwt() -> 'app_metadata' ->> 'role') = _role::text
$$;
