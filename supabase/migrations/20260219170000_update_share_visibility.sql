-- ============================================
-- RLS UPDATE: BOARD_SHARES VISIBILITY
-- ============================================

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Shared users can view own shares" ON public.board_shares;

-- Create new policy: Members can view ALL shares for the board they are part of
CREATE POLICY "Members can view board members" ON public.board_shares FOR SELECT TO authenticated
  USING (
    -- User is the owner of the board
    EXISTS (SELECT 1 FROM public.boards WHERE id = board_id AND owner_id = auth.uid()) OR
    -- OR user is a member of the board
    EXISTS (
      SELECT 1 FROM public.board_shares my_share 
      WHERE my_share.board_id = board_shares.board_id 
      AND my_share.shared_with_user_id = auth.uid()
    )
  );
