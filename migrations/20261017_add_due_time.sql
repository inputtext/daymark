-- Daymark v0.6: optional task time in local 24-hour HH:mm format.
-- Run once in your InsForge SQL editor BEFORE using cloud task times.
-- Existing rows remain valid; this is additive and does not change RLS.
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS due_time varchar(5) DEFAULT NULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname='tasks_due_time_format_chk'
      AND conrelid='public.tasks'::regclass
  ) THEN
    ALTER TABLE public.tasks ADD CONSTRAINT tasks_due_time_format_chk
      CHECK (due_time IS NULL OR due_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');
  END IF;
END $$;
COMMENT ON COLUMN public.tasks.due_time IS 'Optional local wall-clock task time, HH:mm; no timezone or exact alarm implied';
