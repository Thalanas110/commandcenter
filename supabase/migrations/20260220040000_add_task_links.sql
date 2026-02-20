-- ============================================
-- Add task_links table for card linking
-- ============================================

DO $$ BEGIN
  CREATE TYPE public.task_link_type AS ENUM (
    'relates_to',
    'blocks',
    'is_blocked_by',
    'duplicates'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.task_links (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_task_id  UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  target_task_id  UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  link_type       public.task_link_type NOT NULL DEFAULT 'relates_to',
  created_by      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Prevent duplicate directed links
  CONSTRAINT task_links_unique_pair UNIQUE (source_task_id, target_task_id),
  -- Prevent self-linking
  CONSTRAINT task_links_no_self CHECK (source_task_id <> target_task_id)
);

CREATE INDEX idx_task_links_source ON public.task_links(source_task_id);
CREATE INDEX idx_task_links_target ON public.task_links(target_task_id);

ALTER TABLE public.task_links ENABLE ROW LEVEL SECURITY;

-- Helper: check if user can access a task
CREATE OR REPLACE FUNCTION public.user_can_access_task(p_task_id UUID, p_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tasks t
    JOIN public.columns c ON c.id = t.column_id
    JOIN public.boards b ON b.id = c.board_id
    WHERE t.id = p_task_id
      AND (
        b.owner_id = p_user_id
        OR EXISTS (
          SELECT 1 FROM public.board_shares bs
          WHERE bs.board_id = b.id AND bs.shared_with_user_id = p_user_id
        )
        OR public.has_role(p_user_id, 'admin')
      )
  );
$$;

-- Select: user must be able to access the source task
CREATE POLICY "Users can view links for accessible tasks"
  ON public.task_links FOR SELECT TO authenticated
  USING (
    public.user_can_access_task(source_task_id, auth.uid())
    OR public.user_can_access_task(target_task_id, auth.uid())
  );

-- Insert: user must be able to access both tasks
CREATE POLICY "Users can create links between accessible tasks"
  ON public.task_links FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND public.user_can_access_task(source_task_id, auth.uid())
    AND public.user_can_access_task(target_task_id, auth.uid())
  );

-- Delete: link creator or admin can delete
CREATE POLICY "Users can delete own links"
  ON public.task_links FOR DELETE TO authenticated
  USING (
    created_by = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );
