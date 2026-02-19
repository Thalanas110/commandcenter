-- ============================================
-- Add board_id to labels for per-board scoping
-- ============================================

-- 1. Add board_id column (nullable first to avoid breaking existing data)
ALTER TABLE public.labels
  ADD COLUMN IF NOT EXISTS board_id UUID REFERENCES public.boards(id) ON DELETE CASCADE;

-- 2. Drop old global RLS policies on labels
DROP POLICY IF EXISTS "All authenticated users can view labels" ON public.labels;
DROP POLICY IF EXISTS "Admins can manage labels" ON public.labels;

-- 3. New board-scoped RLS policies for labels

-- Board owners can do everything with their board's labels
CREATE POLICY "Board owners can manage labels"
  ON public.labels FOR ALL TO authenticated
  USING (
    board_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.boards
      WHERE id = board_id AND owner_id = auth.uid()
    )
  )
  WITH CHECK (
    board_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.boards
      WHERE id = board_id AND owner_id = auth.uid()
    )
  );

-- Board members (shared) can view labels on their shared boards
CREATE POLICY "Shared users can view board labels"
  ON public.labels FOR SELECT TO authenticated
  USING (
    board_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.board_shares
      WHERE board_id = labels.board_id AND shared_with_user_id = auth.uid()
    )
  );

-- Admins can view all labels
CREATE POLICY "Admins can view all labels"
  ON public.labels FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_labels_board_id ON public.labels(board_id);
