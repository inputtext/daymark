# Daymark v0.7.2 — Expressive loading, Google Sans Flex and Calendar Reminders

**Stacked draft PR** on v0.7.1. No merge, production deploy, or InsForge migration automatically applied.

## Typography
- Use Google Sans Flex Variable, with a bold 800–850 weight on headings and 400–700 on form text, cards, and buttons; fallback to DM Sans/system sans if the CDN is unavailable.
- Load the OFL-licensed font from a pinned Fontsource package stylesheet on jsDelivr CDN. No proprietary design assets and no font binaries committed. The initial font request requires internet; subsequent offline availability depends on the WebView cache. See: https://github.com/googlefonts/googlesans-flex (OFL) and https://fontsource.org/fonts/google-sans-flex/use.

## Loading UX and speed
- The Google-inspired shape loader is a **new original CSS/SVG-free geometric animation**, with rotating starburst, round shifting core, and indeterminate multi-line progress; it does **not** show fabricated percent completion.
- Shape loader replaces the splash spinner and tasks-loading UI.
- Calendar and Notes views are loaded with React.lazy code-splitting and Suspense fallback. Island preferences are lazy loaded in their settings panel. Quick Note editor intentionally stays eager to keep direct thumb swipe capture instant.
- Reduced Motion / OS prefers-reduced-motion disables infinite shape animations and shimmer.

## Task reminder ↔ Calendar linking

### What existed
- Android `DaymarkIsland` native bridge already had `POST_NOTIFICATIONS`, a permission-request method, persistent `AlarmManager` scheduling, reboot restoration, and standard notification fallback.
- Task long-press manual reminders in 10m / 1h and the island test existed.
- **Calendar task date/time had no scheduled native Android reminder.**

### What is new
- Android task modal shows **Remind me at this time** only when date + time are selected.
- User can uncheck it. On Save, if opted-in, Daymark requests Android notification permission as needed, then schedules a **local, inexact** notification for that local calendar date and time.
- Reminder ID uses `c-<task-id>` and does not overwrite manual `t-<task-id>` alarms.
- Editing an existing task checks native scheduled state. Removing time/opt-out cancels calendar alarm; completing/deleting a task cancels both calendar and manual alarms.
- Moving a dated task in Calendar re-registers its opted-in reminder for the new date, or cancels it if it is now in the past.
- Without permission, the task is still saved; Daymark explains that its reminder was not scheduled.
- Calendar date-only tasks remain unaffected; no due_time DB migration is performed automatically.

### Important caveats
- Android's inexact `setAndAllowWhileIdle` alarm can be delayed by battery policies or Do Not Disturb. Delivery while force-stopped is not guaranteed. No exact-alarm permission is requested.
- Notifications are distinct from opt-in Floating Island: no overlay permission is required for standard Android reminders.
- Native reminders are **local to this installed Pixel**; syncing tasks through InsForge on another device does not automatically transfer its local scheduled alarms. A future cloud-to-device reconciliation should be implemented after QA; this patch deliberately avoids scheduling an older imported task without explicit opt-in.
- Android 13+ notification permission is required; on older Android versions the OS may still block individual channels.
- To save task time in cloud mode, first apply the existing **optional** `migrations/20261017_add_due_time.sql` in InsForge SQL editor; this branch does not run migrations for you.

## Physical Pixel 9 QA
1. Tap FAB: confirm a modest extra spring, three actions still work, native haptics respect Off.
2. Switch Notes and Calendar on mobile and watch shapes while their chunks load (fast caches may mean loaders are only briefly visible). Check app cold start and task fetch.
3. Use Android Settings → Apps → Daymark → Notifications; test allowed and denied. In app create future task with date/time, enable Remind me, save; check notification near time, allowing OS delay.
4. With Island off, verify normal notification still appears. Overlay permission is optional, not required.
5. Edit task time to a different future time, save and test that only latest notification fires.
6. Drag/move task to another calendar day and confirm reminder shifts with it.
7. Remove time, complete or delete a task: reminder should be canceled.
8. Reboot Pixel 9 before a future reminder; check native reboot restore diagnostics, then delivery.
9. Turn on Do Not Disturb and battery saver; observe Android-managed suppression/delays, not crashes.
10. Check light/dark mode, 320px screen, text scaling, system Reduced Motion, and normal task gestures.
11. Verify signed-in cloud mode task time saving with `due_time` migration present. No global server-side jobs created.

## Install
**VS Code PowerShell terminal:**
```powershell
cd "D:\Downloads\daymark-insforge-todo\daymark-expressive"
git status --short
# Preserve modified/untracked Android Studio files before branch switch, only if needed:
git stash push -u -m "Local Android work before v0.7.2"
git fetch origin
git switch -c preview/expressive-loading --track origin/feat/v0.7.2-expressive-loading-reminders
npm ci
npm test
npm run build
npx cap sync android
npx cap open android
```
Existing local branch: `git switch preview/expressive-loading` and `git pull --ff-only`.
**Android Studio:** select connected Pixel 9, Run ▶ `app`, confirm project `D:\Downloads\daymark-insforge-todo\daymark-expressive\android`.
