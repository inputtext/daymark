-- Daymark task query indexes (apply to staging first).
-- Run outside a transaction: CREATE INDEX CONCURRENTLY cannot run inside one.
-- These indexes support owner-scoped RLS task reads and upcoming-task lookups.
-- Confirm table/column names and EXPLAIN ANALYZE plans before production rollout.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_daymark_tasks_user_created
  ON public.tasks (user_id, created_at DESC, id DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_daymark_tasks_user_due_active
  ON public.tasks (user_id, due_date ASC, id)
  WHERE is_complete = false AND due_date IS NOT NULL;

-- Verification:
-- EXPLAIN (ANALYZE, BUFFERS)
-- SELECT id, title, due_date FROM public.tasks
-- WHERE user_id = '<test-user-uuid>'
-- ORDER BY created_at DESC, id DESC LIMIT 50;
--
-- Rollback (also outside a transaction):
-- DROP INDEX CONCURRENTLY IF EXISTS public.idx_daymark_tasks_user_due_active;
-- DROP INDEX CONCURRENTLY IF EXISTS public.idx_daymark_tasks_user_created;
