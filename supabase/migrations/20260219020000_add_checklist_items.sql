-- ============================================
-- CHECKLIST ITEMS
-- ============================================
CREATE TABLE public.checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_checklist_items_task_id ON public.checklist_items(task_id);

-- ============================================
-- RLS POLICIES: CHECKLIST_ITEMS
-- ============================================
CREATE POLICY "Board owners can manage checklist items" ON public.checklist_items FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tasks t
    JOIN public.columns c ON c.id = t.column_id
    JOIN public.boards b ON b.id = c.board_id
    WHERE t.id = task_id AND b.owner_id = auth.uid()
  ));

CREATE POLICY "Shared users can view checklist items" ON public.checklist_items FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tasks t
    JOIN public.columns c ON c.id = t.column_id
    JOIN public.board_shares bs ON bs.board_id = c.board_id
    WHERE t.id = task_id AND bs.shared_with_user_id = auth.uid()
  ));

CREATE POLICY "Admins can view all checklist items" ON public.checklist_items FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- ENABLE REALTIME
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.checklist_items;
