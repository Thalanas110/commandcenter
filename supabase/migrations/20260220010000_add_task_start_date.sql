-- Add start_date to tasks for Gantt chart support
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS start_date date NULL;
