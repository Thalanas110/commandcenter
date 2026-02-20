-- ============================================
-- Add task_comments table with categories
-- ============================================

DO $$ BEGIN
  CREATE TYPE public.comment_category AS ENUM (
    'TASK_UPDATES',
    'QUESTIONS',
    'GENERAL_COMMENTS'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE public.task_comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  category    public.comment_category NOT NULL DEFAULT 'GENERAL_COMMENTS',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookup by task
CREATE INDEX idx_task_comments_task_id ON public.task_comments(task_id);
CREATE INDEX idx_task_comments_user_id ON public.task_comments(user_id);

-- Enable RLS
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

-- Users can read comments on tasks they can access
-- (tasks belong to columns, which belong to boards the user owns or is shared with)
CREATE POLICY "Users can view comments on accessible tasks"
  ON public.task_comments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.columns c ON c.id = t.column_id
      JOIN public.boards b ON b.id = c.board_id
      WHERE t.id = task_comments.task_id
        AND (
          b.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.board_shares bs
            WHERE bs.board_id = b.id AND bs.shared_with_user_id = auth.uid()
          )
          OR public.has_role(auth.uid(), 'admin')
        )
    )
  );

-- Users can insert their own comments on accessible tasks
CREATE POLICY "Users can add comments on accessible tasks"
  ON public.task_comments FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.columns c ON c.id = t.column_id
      JOIN public.boards b ON b.id = c.board_id
      WHERE t.id = task_comments.task_id
        AND (
          b.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.board_shares bs
            WHERE bs.board_id = b.id AND bs.shared_with_user_id = auth.uid()
          )
          OR public.has_role(auth.uid(), 'admin')
        )
    )
  );

-- Users can update their own comments
CREATE POLICY "Users can update own comments"
  ON public.task_comments FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own comments; admins can delete any
CREATE POLICY "Users can delete own comments"
  ON public.task_comments FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.handle_task_comments_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_task_comments_updated_at
  BEFORE UPDATE ON public.task_comments
  FOR EACH ROW EXECUTE PROCEDURE public.handle_task_comments_updated_at();
