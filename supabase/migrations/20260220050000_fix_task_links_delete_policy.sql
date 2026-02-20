-- ============================================================
-- Fix task_links DELETE policy so card deletion doesn't fail.
-- ============================================================
-- Root cause: The original DELETE policy only allows the link
-- *creator* to delete a task_link row.  When a board owner
-- deletes a task, PostgreSQL's ON DELETE CASCADE fires and
-- tries to delete every task_links row that references the
-- deleted task.  If any of those rows were created by a
-- *different* user (e.g. a board editor), the RLS check
-- (created_by = auth.uid()) fails, the cascade is blocked,
-- the FK constraint is violated, and the whole task DELETE
-- rolls back — making card deletion appear broken.
--
-- Fix: extend the policy so that the board owner of *either*
-- task in the link can also delete it.  At the moment the
-- cascade fires the parent task row still exists in the
-- database (cascade happens before the parent is removed),
-- so get_task_board_id() can still resolve the board id
-- correctly for both sides of the link.
-- ============================================================

DROP POLICY IF EXISTS "Users can delete own links" ON public.task_links;

CREATE POLICY "Users can delete own links"
  ON public.task_links FOR DELETE TO authenticated
  USING (
    -- Link creator (original permission)
    created_by = auth.uid()
    -- Platform admin
    OR public.has_role(auth.uid(), 'admin')
    -- Board owner of the source task's board
    OR public.is_board_owner(public.get_task_board_id(source_task_id))
    -- Board owner of the target task's board (covers reverse-link cascade)
    OR public.is_board_owner(public.get_task_board_id(target_task_id))
  );
