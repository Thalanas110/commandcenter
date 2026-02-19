-- ============================================
-- TASK ATTACHMENTS
-- ============================================

-- 1. Create Storage Bucket
-- (This is usually done in the UI, but we can try to seed it via SQL or just rely on the user creating it if SQL fails.
--  Standard Supabase approach is to insert into storage.buckets)
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-attachments', 'task-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Create Table
CREATE TABLE public.task_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_task_attachments_task_id ON public.task_attachments(task_id);

-- 3. RLS Policies
-- READ: Users who can view the task can view the attachment
CREATE POLICY "Users can view attachments" ON public.task_attachments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.columns c ON c.id = t.column_id
      JOIN public.boards b ON b.id = c.board_id
      LEFT JOIN public.board_shares bs ON bs.board_id = b.id AND bs.shared_with_user_id = auth.uid()
      WHERE t.id = task_attachments.task_id
      AND (b.owner_id = auth.uid() OR bs.id IS NOT NULL OR public.has_role(auth.uid(), 'admin'))
    )
  );

-- INSERT: Users who can edit the task can upload
CREATE POLICY "Users can upload attachments" ON public.task_attachments
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.columns c ON c.id = t.column_id
      JOIN public.boards b ON b.id = c.board_id
      LEFT JOIN public.board_shares bs ON bs.board_id = b.id AND bs.shared_with_user_id = auth.uid()
      WHERE t.id = task_attachments.task_id
      AND (b.owner_id = auth.uid() OR bs.permission IN ('edit', 'admin') OR public.has_role(auth.uid(), 'admin'))
    )
  );

-- DELETE: Users who can edit the task can delete
CREATE POLICY "Users can delete attachments" ON public.task_attachments
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.columns c ON c.id = t.column_id
      JOIN public.boards b ON b.id = c.board_id
      LEFT JOIN public.board_shares bs ON bs.board_id = b.id AND bs.shared_with_user_id = auth.uid()
      WHERE t.id = task_attachments.task_id
      AND (b.owner_id = auth.uid() OR bs.permission IN ('edit', 'admin') OR public.has_role(auth.uid(), 'admin'))
    )
  );

-- 4. Storage Policies
-- We need to allow access to the bucket 'task-attachments'

CREATE POLICY "task_attachments_select" ON storage.objects FOR SELECT TO public USING (bucket_id = 'task-attachments');
CREATE POLICY "task_attachments_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'task-attachments');
CREATE POLICY "task_attachments_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'task-attachments');
