-- ============================================
-- FIX: INFINITE RECURSION IN RLS
-- ============================================

-- Problem: The "Members can view board members" policy on board_shares 
-- performs a SELECT on board_shares, which triggers the policy again, 
-- causing infinite recursion (Stack Depth Limit Exceeded / 500 Error).

-- Solution: Create a SECURITY DEFINER function to check membership.
-- This function bypasses RLS for the check, breaking the loop.

CREATE OR REPLACE FUNCTION public.check_is_board_member(check_board_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.board_shares 
    WHERE board_id = check_board_id 
    AND shared_with_user_id = auth.uid()
  );
$$;

-- Drop the recursive policy
DROP POLICY IF EXISTS "Members can view board members" ON public.board_shares;

-- Re-create the policy using the safe function
CREATE POLICY "Members can view board members" ON public.board_shares FOR SELECT TO authenticated
  USING (
    -- User is the owner (check boards directly)
    EXISTS (SELECT 1 FROM public.boards WHERE id = board_id AND owner_id = auth.uid()) 
    OR 
    -- User is a member (use safe function)
    public.check_is_board_member(board_id)
  );

-- OPTIONAL: Optimize other policies to use this function if they were also recursive
-- Most likely they were querying board_shares, effectively triggering the same recursion.
-- Once board_shares is fixed, they should be fine, but using the function is safer/faster.
