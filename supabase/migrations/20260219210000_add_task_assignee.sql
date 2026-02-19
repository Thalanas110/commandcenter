-- ============================================================
-- Add assigned_to column to tasks for task assignment feature
-- ============================================================

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Index for performant lookups by assignee
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks(assigned_to);

-- No new RLS policies needed:
-- tasks_member_select / tasks_editor_write (from fix_all_rls_recursion migration)
-- already cover all columns including assigned_to.
