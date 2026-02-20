-- Activity log retention policy
-- Automatically purges:
--   1. Logs older than 60 days
--   2. Anything beyond the 500 most-recent rows
-- This prevents the activity_logs table from ballooning with noise.

CREATE OR REPLACE FUNCTION public.trim_activity_logs()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Remove entries older than 60 days
  DELETE FROM public.activity_logs
  WHERE created_at < NOW() - INTERVAL '60 days';

  -- Hard cap: keep only the newest 500 rows overall
  DELETE FROM public.activity_logs
  WHERE id IN (
    SELECT id
    FROM public.activity_logs
    ORDER BY created_at DESC
    OFFSET 500
  );

  RETURN NEW;
END;
$$;

-- Drop old trigger if it exists so re-running this migration is safe
DROP TRIGGER IF EXISTS trim_activity_logs_trigger ON public.activity_logs;

CREATE TRIGGER trim_activity_logs_trigger
AFTER INSERT ON public.activity_logs
FOR EACH STATEMENT
EXECUTE PROCEDURE public.trim_activity_logs();
