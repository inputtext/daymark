# Daymark native Android Home Screen Widgets — QA and integration

**Feature branch:** `feat/v08-android-home-widgets`, built on validated `feat/v09-smart-quick-add`.
**Includes:** three **native AppWidgetProvider** widgets. No launcher service, no new Android permissions, no InsForge migration, no WebView hosted in widgets.

## Implemented
- **Today's Tasks:** active due-today and overdue tasks, sorted by due date/time, with tap-to-open Daymark.
- **Upcoming Reminders:** active future-dated tasks (not a live notification queue), sorted by due date/time.
- **Daily Progress:** completed today / (completed today + currently open tasks due today or overdue), with a native progress bar. This denominator intentionally differs from all-time app statistics.
- Resizable layouts show 1–4 rows based on launcher-provided minHeight. Compact widgets keep titles legible.
- Android 12+ (API 31+) dynamic colors use Android's Material You wallpaper palette; Android 7–11 use bundled fallback colors.
- Data is **local-only** and read-only in app-private SharedPreferences. React syncs a limited snapshot after tasks load/change, including signed-in cloud refresh and offline demo changes. No network access in widget provider.
- Snapshots contain only title, date, time, completion flag, and local completion day (no task ID, notes, auth tokens, user email, or backend credentials).
- Clears snapshot on account sign-out, guest state, and biometric lock. Widget taps launch Daymark; no task changes can happen before app authentication.
- Date/time and boot broadcasts recompute currently displayed entries from the cached snapshot. Widget data is only as current as the most recent app task refresh. Requires opening Daymark at least once after installing updated APK and for cloud changes made on other devices.

## Build/Install
```powershell
git fetch origin
git switch --track origin/feat/v08-android-home-widgets
npm ci
npm test
npm run build
npx cap sync android
npx cap open android
```
If the branch exists locally, switch to it and `git pull --ff-only`. In Android Studio build/install and run the app on a real Android device. Android launchers: long-press an empty space → Widgets → Daymark → add each widget.

## Manual verification
1. Add all three widgets. Check display in a demo session and in a signed-in cloud workspace after tasks load.
2. Today includes due-today and overdue **incomplete** tasks; Upcoming only includes future incomplete tasks.
3. Create, complete, reschedule and delete tasks in the app; return Home and confirm widgets update.
4. Add a cloud task on another device. Open Daymark on this phone with internet to refresh, then verify the widget.
5. Resize Today/Upcoming to short and tall sizes. Confirm labels, truncation and 1–4 items. Resize Progress; verify readability.
6. Wallpaper/color change on Android 12+, light/dark, and test Android <12 fallback.
7. Change device date/time/timezone and relaunch home screen. Confirm Today/Upcoming grouping is recomputed; no internet request.
8. Restart phone; widgets should still show last unlocked snapshot and recompute at boot if widget data wasn't cleared.
9. Enable biometric lock. Background Daymark; widget contents should clear. Unlock Daymark and verify refreshed widgets. Sign out and ensure prior tasks are no longer visible.
10. Tap each widget. Confirm it opens Daymark, does not bypass biometric authentication, and doesn't complete tasks accidentally.
11. Airplane mode: demo tasks continue syncing locally; cloud widgets show last cache until app refresh.
12. Check that normal Android reminders, in-app Smart Quick Add and desktop web remain working.

## Scope/limitations
- **No background cloud polling**, no direct task completion from launcher, no early notifications or recurrence. Upcoming is a deadline list, not live notification-schedule introspection.
- Completion tracking depends on task `updated_at`; imported tasks lacking that timestamp cannot be counted as completed-today.
- Widget layouts have no custom launcher animation. Android OEM launchers determine widget margins, scaling and update timing.
- Daily progress uses the last synced cached task sample. A synchronized task limit of 2,000 prevents launcher cache abuse; over-limit accounts require a future aggregated snapshot format.
- **Security:** Widget storage is a local cache, not an encrypted vault. Clear on sign-out/lock is best effort from the running WebView. For high-sensitivity deployments, also disable widget task titles or move to a protected native data store. Do not assume biometric app lock protects the launcher independently.
