-- ============================================
-- CATEGORIES — group columns on a board
-- ============================================
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6366f1',
  board_id UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_categories_board_id ON public.categories(board_id);

-- updated_at trigger
CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- ADD category_id FK to columns
-- ============================================
ALTER TABLE public.columns
  ADD COLUMN category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL;
CREATE INDEX idx_columns_category_id ON public.columns(category_id);

-- ============================================
-- RLS POLICIES: CATEGORIES
-- ============================================
CREATE POLICY "Board owners can manage categories" ON public.categories FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.boards WHERE id = board_id AND owner_id = auth.uid()));

CREATE POLICY "Shared users can view categories" ON public.categories FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.board_shares bs
    JOIN public.boards b ON b.id = board_id
    WHERE bs.board_id = b.id AND bs.shared_with_user_id = auth.uid()
  ));

CREATE POLICY "Admins can view all categories" ON public.categories FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- REALTIME
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.categories;
