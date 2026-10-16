-- Run as the project administrator using InsForge migrations.
-- User data is private by default. Never grant access to anon.
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 240),
  notes TEXT NOT NULL DEFAULT '' CHECK (char_length(notes) <= 4000),
  due_date DATE,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high')),
  is_complete BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS tasks_user_due_date_idx ON public.tasks(user_id, due_date);
CREATE INDEX IF NOT EXISTS tasks_user_complete_idx ON public.tasks(user_id, is_complete);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY tasks_select_own ON public.tasks FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY tasks_insert_own ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY tasks_update_own ON public.tasks FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY tasks_delete_own ON public.tasks FOR DELETE TO authenticated
  USING (user_id = auth.uid());

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
REVOKE ALL ON public.tasks FROM anon;

CREATE TRIGGER tasks_touch_updated_at BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION system.update_updated_at();
