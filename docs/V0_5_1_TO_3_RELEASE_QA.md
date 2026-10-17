# Daymark Island v0.5.1 → v0.5.3 — Pixel 9 release gate

**Status: experimental.** These branches are stacked, unmerged, and not deployed. A successful CI build verifies compilation and unit tests; it does not verify overlay behavior on your physical Pixel 9.

## v0.5.1 — Floating Island prototype
Existing implementation (PR #10 and camera-alignment PR #11):
- Off-by-default Personalize toggle, Android overlay/notification permission flow.
- Compact pill, expandable actions (Snooze 10m / Open Daymark / Dismiss), auto-dismiss after ~14s.
- Manual preview, ~1-minute test alarm, task reminder scheduling.
- Per-device camera alignment and safe below-status-bar mode.
- Fallback to normal Android notification when overlays are blocked or disabled.

## v0.5.2 — Expressive motion
- Native damped spring interpolator for entrance, width morph, and corner radius.
- Expand/collapse card with staged detail reveal; swipe horizontally to dismiss, release a short drag to spring back.
- Android View.performHapticFeedback for expansion, collapse, action taps and successful swipe, respecting Off/Subtle/Balanced/Strong and global touch settings.
- No GSAP/WebView loop; animations are Android-native. Motion tuning and accessibility must be verified on hardware.

## v0.5.3 — Background reliability and diagnostics
- AlarmManager inexact idle-aware RTC_WAKEUP alarms, locally persisted and re-registered after BOOT_COMPLETED / TIME_SET / TIMEZONE_CHANGED.
- Register alarms before saving pending record, avoiding phantom pending entries when Android refuses scheduling.
- Receiver posts a normal notification first when allowed; only then attempts the optional overlay. Locked screen, disabled overlay, revoked permission and blocked background service starts fall back to notification when notifications are allowed.
- Personalize shows local **Last reminder**, **Last island attempt**, **Last delivery time**, and **Reboot restore** counts. These diagnostics are not uploaded.
- Do Not Disturb can silence or hide notifications even if Android accepts the post; permission revoked for notifications means no notification can be shown. Android 15+ can refuse background foreground-service starts even when overlays are permitted. Neither can be bypassed.

## Mandatory physical Pixel 9 test matrix

| Scenario | Steps | Expected result |
|---|---|---|
| Foreground preview | Personalize → enable, grant overlay → Preview | Pill appears near chosen position; expands/collapses, buttons work, disappears ~14s |
| Motion | Preview → tap, tap background to collapse; drag right/left short/long | Spring-like morph; short drag springs back; long swipe dismisses; no stuck overlay |
| Haptics | Off, Subtle, Balanced, Strong; repeat preview actions | Off = no Daymark haptics; other levels use system effects; respect Android global touch feedback |
| Daymark closed | Schedule ~1m test; leave Daymark with Home; wait (may be delayed) | Notification posts if allowed; overlay may not start due to Android restrictions; inspect diagnostics after reopening |
| Screen locked | Schedule test; lock phone before alarm | No floating window over locked screen; normal lock-screen notification per OS settings |
| Reboot | Schedule 10m task reminder; restart Pixel 9 before it fires; reopen app after reboot | Diagnostics show re-registered future reminders; eventual notification if allowed |
| Do Not Disturb | Enable DND, schedule test, wait | Notification may be silent/hidden; no permission bypass; check notification history and diagnostics |
| Overlay revoked | Enable, preview; revoke Display over other apps in Android settings; schedule test | No floating overlay; normal notification fallback if notifications allowed; diagnostics report permission missing |
| Notifications revoked | Revoke notification permission; schedule test | No notification; overlay remains best effort when permitted/unlocked; diagnostics report blocked notification |
| Both revoked | Revoke both, schedule test | No unauthorized UI; diagnostics show blocked; app remains stable |
| Battery saver / Doze | Enable battery saver, schedule test | Alarm may be delayed; no exact delivery promise |
| Force-stop | Force-stop app in Settings then wait for a scheduled reminder | Android suppresses scheduled broadcasts while app is force-stopped; reopen app to re-enable normal behavior |
| Regression | Open Daymark, swipe/long-press tasks, test task completion/deletion | v0.4 gestures and native Pixel haptics remain functional |

**Important:** Do not use adb `am force-stop` as evidence that background alarms are broken; Android deliberately prevents force-stopped apps from receiving them. For the 'closed' test, use Home or swipe the task from Recents instead.

### Developer verification

**VS Code PowerShell terminal** at `D:\Downloads\daymark-insforge-todo\daymark-expressive`:

```powershell
git status --short
git fetch origin
git switch -c preview/island-reliability --track origin/feat/v0.5.3-island-reliability
npm ci
npm test
npm run build
npx cap sync android
npx cap open android
```

If the preview branch already exists: `git switch preview/island-reliability` then `git pull --ff-only`. If `git status --short` shows generated Android changes, stash them before switching.

**Android Studio:** select the connected physical Pixel 9 → Run ▶ `app`. For logs use Android Studio **Logcat** filtered by package `com.piyush.daymark`; Android system policies can restrict overlay launches.

**Do not merge** until CI is green, physical test matrix is recorded, and any blocked overlay behavior is accurately represented to users. The service's `specialUse` foreground-service classification requires Google Play policy review if the app is ever distributed there.
