-- ============================================
-- ADD COVER IMAGE TO TASKS
-- ============================================
ALTER TABLE public.tasks ADD COLUMN cover_image_url TEXT;

-- ============================================
-- STORAGE BUCKET: task-covers
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-covers', 'task-covers', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to view task covers
CREATE POLICY "Anyone can view task covers"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'task-covers');

-- Board members can upload task covers
CREATE POLICY "Board members can upload task covers"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'task-covers'
    AND auth.uid() IS NOT NULL
  );

-- Board members can update task covers
CREATE POLICY "Board members can update task covers"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'task-covers'
    AND auth.uid() IS NOT NULL
  );

-- Board members can delete task covers
CREATE POLICY "Board members can delete task covers"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'task-covers'
    AND auth.uid() IS NOT NULL
  );
