-- ============================================
-- FUNCTION: get_my_boards
-- ============================================
-- Returns boards where the current user is either the owner OR a member.
-- This bypasses the "Admins see all" RLS for dashboard purposes.

CREATE OR REPLACE FUNCTION public.get_my_boards()
RETURNS SETOF public.boards
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.boards
  WHERE owner_id = auth.uid()
  OR id IN (
    SELECT board_id FROM public.board_shares WHERE shared_with_user_id = auth.uid()
  )
  ORDER BY created_at DESC;
$$;
