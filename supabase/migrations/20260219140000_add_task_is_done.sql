-- ============================================
-- ADD is_done flag to tasks
-- ============================================
ALTER TABLE public.tasks ADD COLUMN is_done BOOLEAN NOT NULL DEFAULT false;

-- Add "On Hold" to default columns when created via categories
-- (existing categories won't be affected — add manually if needed)
