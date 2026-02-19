-- ============================================================
-- Fix task assignee FK: point to public.profiles instead of auth.users
-- PostgREST can only auto-join tables within the same schema (public).
-- The previous migration added assigned_to → auth.users(id), which
-- PostgREST cannot traverse when doing profiles!tasks_assigned_to_fkey.
-- ============================================================

-- Drop the old FK (auth.users target)
ALTER TABLE public.tasks
  DROP CONSTRAINT IF EXISTS tasks_assigned_to_fkey;

-- Re-add FK pointing to public.profiles(id)
-- profiles.id is already synced with auth.users.id via its own FK,
-- so cascades remain correct.
ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_assigned_to_fkey
  FOREIGN KEY (assigned_to)
  REFERENCES public.profiles(id)
  ON DELETE SET NULL;
