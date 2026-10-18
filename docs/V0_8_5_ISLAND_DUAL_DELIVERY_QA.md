# Daymark v0.8.5 — Normal notification + floating Island

**Draft stacked on v0.8.4.** No merge, no InsForge changes, no new permissions or dependencies. No changes to the four Island animation presets.

## Why the screenshot shows a normal notification
The due-reminder receiver already sends a normal high-importance Android heads-up notification and then attempts to start Daymark's opt-in WindowManager overlay. On Android 12+, apps targeting API 31+ are restricted from starting a foreground service in the background. Android 15+ also tightened the permission-only exemption for SYSTEM_ALERT_WINDOW: an already-visible overlay is typically needed unless another exemption applies. The result can be a normal notification **without** the floating Island. This is a system restriction; it is not fixed by faster animation.

Reference: https://developer.android.com/develop/background-work/services/fgs/restrictions-bg-start

## Updated delivery policy
1. **Always first:** Post the normal task reminder with Snooze 10 min / Open Daymark actions. This stays the reliable reminder and works whether floating effects are disabled.
2. **Automatic best effort:** When Floating Island is enabled, Display over other apps is allowed and the phone is unlocked, try to launch the native overlay.
3. **User-initiated recovery:** An opted-in reminder notification now includes **Show Island** between Snooze and Open Daymark. Tapping it explicitly requests the native overlay, which can qualify for Android's notification-interaction foreground-service start exemption. It does NOT cancel the original notification, schedule another alarm, or change the user's tasks.
4. **If Android denies the request:** leave the normal reminder intact; never bypass lock-screen/device/OEM restrictions.
5. **Diagnostics:** The Personalize → Daymark Island panel reports last notification result, last Island service request, whether the native overlay actually displayed, and timestamp. Service failure class is recorded only on the device.

## Important caveats
- **Show Island** appears only when Floating Island is ON and Display over other apps permission is granted, at the time the notification is built.
- If the heads-up banner displays only the first two actions, expand the reminder in the notification shade for **Show Island**.
- Android/OEM restrictions mean that fully automatic floating delivery cannot be guaranteed. User interaction can also fail if another device policy blocks overlays/foreground services.
- Daymark is not Apple's system Dynamic Island and cannot take control of Android's status bar or camera cutout.
- Do not turn off or lower the priority of the normal notification; it remains necessary for accessibility and reliability.
- When the device is locked, only the normal notification is used. Unlock before selecting Show Island.
- The Island overlay remains optional, lasts about 14 seconds and uses existing Spring Flow, Fruit Bloom, Elastic Pop or Silk Glide animation.

## Test on Android devices
1. Update native APK. In Daymark → Personalize → Daymark Island: turn ON Floating Island and grant **Display over other apps**. Also enable Android Notifications.
2. Tap **Preview Island**. The animated floating overlay should open. If this fails, fix permissions before testing scheduled reminders.
3. Tap **Test reminder · ~1 min**, go to Home screen, keep phone unlocked. When due, see normal heads-up. Ideally native Island also automatically appears; if not, expand notification and tap **Show Island**.
4. Tap **Refresh status** and inspect **Last Island status**:
   - `Floating Island displayed successfully`: native overlay actually opened.
   - `Automatic background start blocked by Android ...`: OS denied auto-launch.
   - `Display over other apps permission missing` / `Floating Island switched off`: settings need changes.
   - `Phone locked ...`: expected normal-only delivery.
   - `Floating Island failed to display ...`: service started but window couldn't draw. Capture Logcat and OS version.
5. Verify tapping Show Island does not remove the normal notification or create duplicate scheduled reminders.
6. Verify the original Snooze 10 min and Open Daymark actions still work.
7. Turn Floating Island OFF: normal notification arrives; Show Island action absent.
8. Revoke overlay permission: normal notification arrives; Show Island action absent.
9. Test all four animation styles on Android 7–16 baseline where available, at least two OEM devices, small-screen / no camera cutout / cutout devices, background/app-foreground.
10. Test locked device, DND, battery saver, OS notification channel settings, rotation, and reboot restoration.
11. If Android blocks the user-initiated start too, use **Open Daymark**; Island Preview works only after entering foreground.

## Install
**VS Code PowerShell** (dedicated preview worktree):
```powershell
cd "D:\Downloads\daymark-insforge-todo\daymark-onboarding"
git status --short
git fetch origin
git switch -c preview/v085-island --track origin/fix/v0.8.5-island-reminder-delivery
npm ci
npm test
npm run build
npx cap sync android
npx cap open android
```
If `preview/v085-island` already exists: `git switch preview/v085-island` and `git pull --ff-only`. Review/preserve local changes before switching.

**Android Studio:** select any compatible phone, Run ▶. The new notification action/Receiver/Service behavior is native Java so a web-only build is insufficient.
