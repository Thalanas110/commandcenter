-- ============================================
-- ADD BACKGROUND IMAGE TO BOARDS
-- ============================================
ALTER TABLE public.boards ADD COLUMN background_image_url TEXT;

-- ============================================
-- STORAGE BUCKET: board-backgrounds
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('board-backgrounds', 'board-backgrounds', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to view board backgrounds
CREATE POLICY "Anyone can view board backgrounds"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'board-backgrounds');

-- Board owners can upload board backgrounds
CREATE POLICY "Board owners can upload board backgrounds"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'board-backgrounds'
    AND EXISTS (
      SELECT 1 FROM public.boards b
      WHERE b.id::text = (storage.foldername(storage.objects.name))[1]
        AND b.owner_id = auth.uid()
    )
  );

-- Board owners can update board backgrounds
CREATE POLICY "Board owners can update board backgrounds"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'board-backgrounds'
    AND EXISTS (
      SELECT 1 FROM public.boards b
      WHERE b.id::text = (storage.foldername(storage.objects.name))[1]
        AND b.owner_id = auth.uid()
    )
  );

-- Board owners can delete board backgrounds
CREATE POLICY "Board owners can delete board backgrounds"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'board-backgrounds'
    AND EXISTS (
      SELECT 1 FROM public.boards b
      WHERE b.id::text = (storage.foldername(storage.objects.name))[1]
        AND b.owner_id = auth.uid()
    )
  );
