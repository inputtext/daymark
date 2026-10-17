-- Daymark v0.8 Notes: user-scoped, offline-capable soft-delete records.
-- Review and back up your InsForge project before applying this migration.
CREATE TABLE IF NOT EXISTS public.daymark_notes (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '' CHECK (char_length(title) <= 160),
  body TEXT NOT NULL DEFAULT '' CHECK (char_length(body) <= 12000),
  pinned BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS daymark_notes_owner_updated_idx
  ON public.daymark_notes(user_id,updated_at DESC);
ALTER TABLE public.daymark_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS daymark_notes_read_own ON public.daymark_notes;
DROP POLICY IF EXISTS daymark_notes_insert_own ON public.daymark_notes;
DROP POLICY IF EXISTS daymark_notes_update_own ON public.daymark_notes;
DROP POLICY IF EXISTS daymark_notes_delete_own ON public.daymark_notes;
CREATE POLICY daymark_notes_read_own ON public.daymark_notes FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY daymark_notes_insert_own ON public.daymark_notes FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY daymark_notes_update_own ON public.daymark_notes FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY daymark_notes_delete_own ON public.daymark_notes FOR DELETE TO authenticated
  USING (user_id = auth.uid());
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.daymark_notes TO authenticated;
REVOKE ALL ON public.daymark_notes FROM anon;
-- Keep the client-supplied offline edit timestamp to reconcile changes.
-- Do not add an updated_at server trigger to this table.
