-- ============================================
-- FIX: BOARD_INVITES created_by DEFAULT
-- ============================================
ALTER TABLE public.board_invites ALTER COLUMN created_by SET DEFAULT auth.uid();

-- ============================================
-- FIX: BOARD_SHARES FOREIGN KEY
-- ============================================
-- PostgREST needs a FK to public.profiles to automatically detect the relationship 
-- for `profiles:shared_with_user_id`.
-- Check if constraint exists effectively or just drop blindly using standard naming matches.

DO $$
BEGIN
    -- Drop the FK to auth.users if it exists (standard name)
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'board_shares_shared_with_user_id_fkey') THEN
        ALTER TABLE public.board_shares DROP CONSTRAINT board_shares_shared_with_user_id_fkey;
    END IF;
END $$;

-- Add new FK to public.profiles
ALTER TABLE public.board_shares
  ADD CONSTRAINT board_shares_shared_with_user_id_fkey
  FOREIGN KEY (shared_with_user_id) REFERENCES public.profiles(id)
  ON DELETE CASCADE;


-- ============================================
-- FIX: BOARD_INVITES FOREIGN KEY (Optional but Good Practice)
-- ============================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'board_invites_created_by_fkey') THEN
        ALTER TABLE public.board_invites DROP CONSTRAINT board_invites_created_by_fkey;
    END IF;
END $$;

ALTER TABLE public.board_invites
  ADD CONSTRAINT board_invites_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.profiles(id)
  ON DELETE CASCADE;
