# Daymark v0.8 — InsForge Notes Sync + Biometric App Lock (Pixel 9 QA)

**Draft feature branch**, stacked on v0.7.4. Do not merge/deploy until backend migration, CI and native QA are complete.

## Included
- Preserves existing tested InsForge email/password sign-in, email verification, sign-out and task RLS.
- Signed-in Notes: localStorage copy plus per-account InsForge `daymark_notes` table with owner-only RLS.
- On first online sync of a signed-in account, existing `daymark:notes:v1:user:<id>` Notes are uploaded non-destructively, except when the server has a newer note or a deletion tombstone. **Demo Notes are not imported into any account automatically.**
- Local Notes edits, pin changes, and deletions create per-user persistent outbox entries, which upload on reconnect/resume. Server-side soft-delete tombstones propagate deletions to other devices. If remote is unavailable, the local copy remains unchanged and pending work is kept.
- Per-note conflict resolution: client `updated_at` timestamps, with pending local edits winning over fetched remote until acknowledged. Simultaneous edits and device clock skew still need deeper handling in a future release.
- Cloud tasks: cached per signed-in user, refreshed on startup, reconnect and app resume. **Task edits/deletes require online connectivity**; this version does not queue offline task writes.
- Capacitor **Network** and **App** lifecycle plugins.
- Optional Android fingerprint/device credential **app lock** after existing InsForge sign-in, enabled from the bottom of the sidebar. Locks on leaving the app; native system prompt on return; offers sign-out if user can't unlock.
- App lock protects a UI session on an uncompromised Android device; it does **not** replace InsForge sign-in, encrypt browser storage, or protect against rooted devices or OS-level instrumentation. Biometrics are not transmitted to the server.

## One-time backend setup (not automatically applied)
Before touching a production backend, take a backup and inspect existing migrations in your InsForge project.

**VS Code PowerShell, in correct Daymark worktree**:
```powershell
cd "D:\Downloads\daymark-insforge-todo\daymark-expressive"
npx @insforge/cli login
npx @insforge/cli link
npx @insforge/cli db migrations list
```

Review `migrations/20261018_create_daymark_notes.sql` and confirm the project is the correct one. If the Notes migration is pending and other migrations are in the desired state:
```powershell
npx @insforge/cli db migrations up --all
npx @insforge/cli db query "SELECT to_regclass('public.daymark_notes') AS notes_table;"
```
Also verify that `migrations/20261017_add_due_time.sql` was applied for cloud task time fields. Never share your project admin key, backend URL with embedded credentials, or full `.env` file.

### Security smoke test
1. Sign in as account A, create a private Note and cloud task.
2. Sign in as account B on a second browser/device. A's Note/task must NOT appear.
3. B must not read, update, or delete A's UUID record (check RLS denies even a crafted query).
4. Sign out, restart, sign back in as A. A's Note returns.
5. Verify unauthenticated/anon cannot read `daymark_notes` through SDK.

## Install the Android build
**VS Code PowerShell**:
```powershell
cd "D:\Downloads\daymark-insforge-todo\daymark-expressive"
git status --short
# If there ARE local uncommitted Android modifications, inspect them first;
# optionally: git stash push -u -m "Local Android edits before v0.8"
git fetch origin
git switch -c preview/v08-cloud --track origin/feat/v0.8-cloud-sync-biometric-lock
npm ci
npm test
npm run build
npx cap sync android
npx cap open android
```
For an existing `preview/v08-cloud` branch: `git switch preview/v08-cloud`, then `git pull --ff-only`.

**Android Studio**: open `daymark-expressive\android`; select Pixel 9; Run ▶. Use same public InsForge `VITE_INSFORGE_URL` and `VITE_INSFORGE_ANON_KEY` variables in your local ignored `.env` as your tested auth build. Do not put a service/admin key in `VITE_` variables.

## Pixel 9 QA
1. Existing email/password sign-in and sign-out still work. No account data loss.
2. Signed in → Notes → create Note, edit, pin; visible cloud status becomes synced after backend migration.
3. Force-stop/relaunch the app, sign in on another device/browser with same account; Note appears after connection.
4. Airplane mode → edit Note and create another; pending local changes remain, banner says offline. Reconnect and reopen; pending eventually drops to zero.
5. Offline delete → no resurrection after connecting; deletion propagates to another signed-in session after refresh/relaunch.
6. Test same note changed from two devices, observe last-write-wins; document unresolved simultaneous edits.
7. Before sync, keep a pre-v0.8 user-scoped Note; first online sync should upload it while retaining local copy.
8. Demo Notes remain demo-only; no automatic migration to personal account.
9. Cloud tasks reload after returning to foreground, and cached list remains visible offline. Attempt offline edit → explicit warning.
10. Enable **App lock** from sidebar after signed-in. Native Pixel fingerprint / screen lock prompt appears; enable confirmation works.
11. Background and resume → lock screen, fingerprint/PIN unlock. Cancel stays locked; **Sign out instead** returns to sign-in.
12. Disable app lock only after successful device credential confirmation. Demo mode never offers biometric lock.
13. Turn off biometrics in Android Settings; lock must fail closed with a Sign out recovery path, not silently bypass.
14. Toggle reduced motion, dark/light palette, mobile bottom navigation, existing reminder notifications, calendar deletion and Notes FAB.
15. Never clear app data before pending Notes have been synced and backed up.

### Known limitations
- Android-only local app lock (not passwordless server auth).
- Notes localStorage cache/outbox are **unencrypted** in app storage. Consider encrypted SQLite + hardware-backed key as a separate security project.
- No background periodic sync guarantee; foreground connection/resume only.
- Offline cloud **task writes** deferred to v0.8.1 queue/SQLite.
- No automatic migration of demo Notes or tasks into a newly signed-in account.
- No cloud event streaming: sync on open/reconnect/resume/after local edits, not real-time collaboration.
- No server migrations or InsForge deployment have been applied by this PR.
