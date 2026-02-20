-- ============================================
-- Auto-delete done tasks feature
-- ============================================

-- 1. Add auto_delete_after_weeks to categories
--    NULL = disabled, positive integer = delete after N weeks in Done
ALTER TABLE public.categories
  ADD COLUMN auto_delete_after_weeks INTEGER DEFAULT NULL
  CHECK (auto_delete_after_weeks IS NULL OR auto_delete_after_weeks > 0);

-- 2. Add done_at to tasks – timestamped when the task first becomes done
ALTER TABLE public.tasks
  ADD COLUMN done_at TIMESTAMPTZ DEFAULT NULL;

-- 3. Trigger function: auto-stamp done_at when is_done transitions true
CREATE OR REPLACE FUNCTION public.stamp_task_done_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Becoming done: stamp done_at if not already set
  IF NEW.is_done = TRUE AND (OLD.is_done IS DISTINCT FROM TRUE) THEN
    NEW.done_at := COALESCE(NEW.done_at, now());
  END IF;
  -- Un-done: clear the timestamp so the clock resets
  IF NEW.is_done IS NOT TRUE AND OLD.is_done = TRUE THEN
    NEW.done_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_stamp_task_done_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.stamp_task_done_at();
