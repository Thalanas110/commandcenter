-- ============================================================
-- Fix task_comments DELETE policy so card deletion doesn't fail.
-- ============================================================
-- Root cause: The task_comments DELETE policy only permits
-- the comment *author* (user_id = auth.uid()) or an admin to
-- delete a row.  When the board owner deletes a task,
-- PostgreSQL's ON DELETE CASCADE tries to remove every
-- task_comments row for that task.  If ANY comment was written
-- by a *different* user, the RLS check blocks that cascade
-- DELETE, the FK constraint is violated, and the entire task
-- DELETE rolls back — making card deletion fail silently.
--
-- Fix: also allow the board owner of the task's board to
-- delete comments (which covers the cascade path).
-- ============================================================

DROP POLICY IF EXISTS "Users can delete own comments" ON public.task_comments;

CREATE POLICY "Users can delete own comments"
  ON public.task_comments FOR DELETE TO authenticated
  USING (
    -- Comment author
    user_id = auth.uid()
    -- Platform admin
    OR public.has_role(auth.uid(), 'admin')
    -- Board owner (needed so ON DELETE CASCADE succeeds when the parent task is deleted)
    OR public.is_board_owner(public.get_task_board_id(task_id))
  );
