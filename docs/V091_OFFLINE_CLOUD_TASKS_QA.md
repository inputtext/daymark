# Daymark v0.9.1 — Offline cloud task changes (draft)

Status: **feature branch only**, not merged or released.

## User-facing capability

A signed-in user who has already loaded their workspace can create, edit, complete, reschedule, and delete tasks while disconnected. Smart Quick Add remains usable offline. Each change is stored in a per-account local outbox **before** it is reflected in the cached task list. The app shows a pending-change status, automatically tries syncing when online/resumed, and offers **Retry sync** if an attempt fails.

The app does **not** claim a task has reached InsForge until the queued request succeeds. Guest/demo behavior is unchanged. Account-scoped caches and outboxes prevent accidental cross-account mixing.

## Implementation

- `src/lib/cloudTasks.js`: offline outbox, queued create/update/delete, pending overlay, and retry-safe acknowledgements.
- `src/App.jsx`: all cloud task mutations become local-first; refresh overlays outstanding changes; stale refreshes are ignored; sign-out warns if unsynced changes remain.
- `src/components/SmartQuickAdd.jsx`: offline Quick Add is enabled with an accurate save-on-device explanation.
- `tests/cloud-tasks.test.mjs`: unit tests for per-user isolation, queued deletes, write failure and retry, simultaneous edits, schema-migration errors, and non-resurrection of existing deleted records.

Existing server tasks use `UPDATE` rather than `UPSERT` so a previously synced task deleted from another device isn't silently re-created. New tasks use idempotent UUID-based `UPSERT` for retry support. All writes remain subject to the database's existing owner-only RLS.

## Manual acceptance checklist (do **not** mark complete before a real test)

1. Sign in on Android, load tasks, turn off connectivity, then add a task using Quick Add.
2. Edit a cached task, complete another, reschedule another, and delete one offline; confirm changes persist within the running app.
3. Confirm the pending-sync indicator appears and that old cloud data never overrides queued edits or revives queued deletes.
4. Re-enable connectivity. Confirm pending changes upload to InsForge and the indicator clears.
5. Force-close/restart and check surviving cached data and pending changes; validate account session resolution before claiming full cold-start offline support.
6. Test a temporary server/network error: queued changes must remain and retry must work.
7. Switch accounts; confirm Account B never sees Account A's cached tasks or queued changes.
8. Attempt sign-out with unsynced changes; confirm the warning correctly explains those changes remain on this device.
9. Check Android reminders after offline due-date edits and completion, plus the native home widgets.
10. Test two devices editing/deleting the same task; document the conflict behavior.

## Limitations / safety

- Browser/WebView localStorage is **not encrypted**; this does not implement secure storage for sensitive data.
- This is foreground/app-resume/network-triggered sync, **not** a guarantee of background execution while Android has killed the app.
- Concurrent multi-device edits currently follow effective last-write behavior; there is no conflict-resolution UI. When a task was deleted remotely, an offline edit of that existing row will not resurrect it.
- Backend policies and migrations are still prerequisites. Task due times require the existing optional `migrations/20261017_add_due_time.sql`; queued times are retained if that migration is missing.
- Do not publish an APK or promote this draft until CI, InsForge integration, and physical-device tests complete. Production beta v0.9.0 is unaffected.

## Next engineering work

After validating sync on a real backend/device: add explicit per-task conflict feedback, stronger automatic retry/backoff, cold-start offline-session behavior if securely supported by the auth SDK, and reliable reminder reconciliation.
