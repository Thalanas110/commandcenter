-- ============================================================
-- Fix task DELETE for board owners.
-- ============================================================
-- Root cause: "Board owners can manage tasks" uses a plain
-- EXISTS subquery that JOINs public.columns (RLS-enabled) and
-- public.boards inline.  When PostgreSQL evaluates this during
-- a DELETE, it re-evaluates the columns RLS policies, which
-- themselves call into boards/board_shares — causing subtle
-- cross-policy evaluation failures that silently return 0
-- rows deleted without raising an error.
--
-- Fix: replace the manual JOIN with the SECURITY DEFINER
-- helper is_board_owner(get_column_board_id(column_id)), which
-- bypasses RLS entirely and is consistent with every other
-- table's ownership policy post fix_all_rls_recursion.
-- ============================================================

DROP POLICY IF EXISTS "Board owners can manage tasks" ON public.tasks;

CREATE POLICY "tasks_owner" ON public.tasks
  FOR ALL TO authenticated
  USING (public.is_board_owner(public.get_column_board_id(column_id)));
