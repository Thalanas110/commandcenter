-- ============================================
-- ADD COVER IMAGE TO COLUMNS
-- ============================================
ALTER TABLE public.columns ADD COLUMN cover_image_url TEXT;

-- ============================================
-- STORAGE BUCKET: column-covers
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('column-covers', 'column-covers', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to view cover images
CREATE POLICY "Anyone can view column covers"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'column-covers');

-- Board owners can upload column covers
CREATE POLICY "Board owners can upload column covers"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'column-covers'
    AND EXISTS (
      SELECT 1 FROM public.columns c
      JOIN public.boards b ON b.id = c.board_id
      WHERE c.id::text = (storage.foldername(storage.objects.name))[1]
        AND b.owner_id = auth.uid()
    )
  );

-- Board owners can update column covers
CREATE POLICY "Board owners can update column covers"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'column-covers'
    AND EXISTS (
      SELECT 1 FROM public.columns c
      JOIN public.boards b ON b.id = c.board_id
      WHERE c.id::text = (storage.foldername(storage.objects.name))[1]
        AND b.owner_id = auth.uid()
    )
  );

-- Board owners can delete column covers
CREATE POLICY "Board owners can delete column covers"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'column-covers'
    AND EXISTS (
      SELECT 1 FROM public.columns c
      JOIN public.boards b ON b.id = c.board_id
      WHERE c.id::text = (storage.foldername(storage.objects.name))[1]
        AND b.owner_id = auth.uid()
    )
  );
