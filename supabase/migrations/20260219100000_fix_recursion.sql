-- ==========================================
-- Fix 500 Recursion Error & 406 Profile Error
-- ==========================================

-- 1. Create a security definer function to check board ownership
-- This function bypasses RLS on the boards table to prevent infinite recursion
-- when the board_shares policy checks if the user is the owner.
CREATE OR REPLACE FUNCTION public.is_board_owner(_board_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.boards
    WHERE id = _board_id AND owner_id = _user_id
  );
$$;

-- 2. Update the problematic RLS policy on board_shares
-- Previous policy: "Board owners can manage shares"
-- Problem: It queried 'boards' which has RLS, which might query 'board_shares'...
-- New policy: Uses the security definer function to check ownership without triggering RLS.
DROP POLICY IF EXISTS "Board owners can manage shares" ON public.board_shares;
CREATE POLICY "Board owners can manage shares" ON public.board_shares
  FOR ALL TO authenticated
  USING (public.is_board_owner(board_id, auth.uid()));

-- 3. Backfill Missing Profiles
-- This fixes the 406 error for existing users who don't have a profile row.
-- It inserts a profile for every user in auth.users that doesn't exist in public.profiles.
INSERT INTO public.profiles (id, display_name)
SELECT 
  id, 
  COALESCE(raw_user_meta_data->>'display_name', split_part(email, '@', 1))
FROM auth.users
ON CONFLICT (id) DO NOTHING;
