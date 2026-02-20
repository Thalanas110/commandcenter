-- Replace auth.users FK with profiles FK on task_comments.user_id
-- so PostgREST can resolve the profile join
ALTER TABLE public.task_comments
  DROP CONSTRAINT IF EXISTS task_comments_user_id_fkey;

ALTER TABLE public.task_comments
  ADD CONSTRAINT task_comments_user_id_profiles_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
