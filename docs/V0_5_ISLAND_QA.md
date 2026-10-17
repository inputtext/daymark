# Daymark Island v0.5 — Pixel 9 experimental QA

**Status:** pre-release Android-only prototype; off by default. React + Capacitor v8 and the preexisting Pixel 9 haptic plugin are preserved. PR base: \`feat/v0.4-premium-gestures\`. DO NOT merge into \`main\` before a real-device pass.

## Implementation

1. \`DaymarkIslandPlugin.java\`: native Capacitor bridge with status, explicit opt-in switch, notification permission request, Android Settings overlay permission link, preview, schedule and cancel.
2. \`IslandReminders.java\`: locally persisted app-private task reminder records and \`AlarmManager.setAndAllowWhileIdle\` **inexact** scheduling. Does **not** request exact alarm / alarm clock permission; Doze can delay delivery. IDs are task-based; completing/deleting a task cancels its pending local reminder.
3. \`IslandReminderReceiver.java\`: app-owned alarm and notification receiver, notification actions (snooze/open) and reboot/time-change restore. Posts standard notifications **before attempting** to start floating UI. When Android blocks background services, the notification is the fallback.
4. \`DaymarkIslandService.java\`: short-lived (<15 s) \`TYPE_APPLICATION_OVERLAY\` view drawn **below** the real status bar and cutout, with compact pill, animated expanded actions, snooze, open, dismiss and automatic teardown. A short \`specialUse\` foreground service keeps it alive temporarily when permitted. This is not Apple's proprietary Dynamic Island.
5. React settings in **Personalize → Daymark Island** and task **More/long press → Remind in 10 min / 1 hour**, plus a preview and ~1-minute test. Web fallback is disabled rather than pretending to be native.

## Explicit permissions / policy implications

- \`SYSTEM_ALERT_WINDOW\`: user must separately enable **Display over other apps** in Android Settings. Optional. Android's permission screen is opened only by user request. Overlay can be revoked any time.
- \`POST_NOTIFICATIONS\`: Android 13+ runtime permission, requested on explicit tap. Android's own app notification settings and Do Not Disturb can still suppress it.
- \`FOREGROUND_SERVICE\`, \`FOREGROUND_SERVICE_SPECIAL_USE\`: only for the brief floating island while visible, with required service subtype declared in the manifest. **Google Play distribution requires special-use declaration review** and is not guaranteed approval.
- \`RECEIVE_BOOT_COMPLETED\`: re-registers future scheduled alarms after restart. Forced-stop semantics and OS energy-saving policies still apply.
- **No** Accessibility Service, notification-reading permission, permission bypass, full-screen intent, background polling service, exact alarms, or always-on overlay.
- Native preview from a foreground app should be the first test. Android 15+ may reject background foreground-service starts; a normal notification is intentionally always used as fallback when authorized. See https://developer.android.com/develop/background-work/services/fgs/restrictions-bg-start and https://developer.android.com/develop/background-work/services/fgs/service-types

## Test on physical Pixel 9

**VS Code terminal, at the project ROOT** (not \`android/\`):

\`\`\`powershell
cd "D:\Downloads\daymark-insforge-todo\daymark-expressive"
git status --short
git fetch origin
git switch -c preview/daymark-island --track origin/feat/v0.5-island-reminders
npm ci
npm test
npm run build
npx cap sync android
npx cap open android
\`\`\`

**Android Studio:** ensure project folder ends in \`daymark-expressive/android\`; select the Pixel 9 and Run ▶ \`app\`.

1. Personalize (sparkles button): **Island initially Off**. Turn on.
2. Tap **Display over apps → Open permission settings**; grant permission in Android settings; return. Verify it says Allowed.
3. Tap **Notifications → Request permission**; accept. Verify Allowed.
4. **Preview Island**: should show a lilac-accented dark pill near the top outside the actual camera cutout. Tap pill to expand and try Snooze, Open and Dismiss. It must auto-dismiss after around 14 seconds.
5. **Test reminder ~1 min**: set one, switch to Chrome/home, wait. Alarm delivery may take several minutes in Doze. Verify normal Android notification and, where allowed, 14-second island. Tap Snooze to reschedule 10m. On a locked phone, expect normal notification but no island.
6. Long-press an active task, choose **Remind in 10 minutes**. Optionally disable Island; scheduled reminders must still arrive as standard notifications if allowed.
7. Force-stop / reboot / revoke overlay permission / deny notifications. Verify no indefinite overlay, no crashes, and no duplicate alerts. Note that force-stopped Android apps won't receive alarms until relaunched.
8. Test reduced-motion, Pixel native haptic levels, no crashes, no unintended task completion/deletion, no regressions in v0.4 swipe gestures.
9. The island must not cover important system dialogs or claim to render inside the camera cutout.
10. Validate operation under locked/unlocked, dark/light mode, battery saver, and with other apps in foreground.

## Constraints still pending

- Task "Done" from outside Daymark isn't implemented; tapping **Open task** launches Daymark so cloud task state isn't changed silently by background native code.
- This prototype uses relative reminders (10m / 1h, quick ~1m test), not full date-time pickers, calendar recurrence or exact delivery.
- The overlay may not appear in the background on all Android versions; notification fallback is intentional. A Pixel 9 hardware test must determine the actual behavior.
- Not deployed to live InsForge, not merged or published. Device-level privacy, battery, and Play policy review are still required.

