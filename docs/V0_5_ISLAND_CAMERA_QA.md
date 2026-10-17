# Daymark Island camera alignment — Pixel 9 QA

## Why
The v0.5 preview placed the island below the system bar, leaving a noticeable gap beneath the Pixel 9's centered punch-hole. The opt-in **Camera alignment** control requests a closer placement using Android WindowManager full-screen layout flags and stores per-device offsets.

## Native implementation
- `IslandReminders` stores `placementMode`, `placementX`, `placementY`, `placementWidth` in local Android SharedPreferences; these persist across app restarts and apply to previews and scheduled reminders.
- `DaymarkIslandPlugin.setPlacement` validates and saves values (mode camera/safe, x -120..120 dp, y -24..140 dp, width 180..340 dp).
- Camera mode requests `FLAG_LAYOUT_IN_SCREEN | FLAG_LAYOUT_NO_LIMITS` and `LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES` where available; safe mode uses the prior normal system-bar-safe coordinates.
- **Important:** Android always controls the actual status bar and camera cutout. An ordinary `TYPE_APPLICATION_OVERLAY` window may be clipped or layered underneath the status bar, and calibration cannot override that. Camera alignment is best effort, not guaranteed cutout takeover.
- Preview retains automatic 14-second teardown; native haptics, alarm delivery, permission flows, and standard notifications are unchanged.

## Test on Pixel 9
1. In **Personalize → Daymark Island**, switch on and grant overlay permission if needed.
2. Under **Camera alignment**, select **Camera-aligned** and tap **Pixel 9 preset** (x=0, y=0, width=280 dp). Tap **Save alignment**, then **Preview Island**.
3. Adjust **Vertical offset** until the top edge is as close to the camera as Android allows. Negative values move upward; positive values move down. Adjust **Horizontal offset** if needed; 0 centers the pill. Adjust **Pill width** to match your preferred look.
4. Tap **Save alignment** after each change, then **Preview Island** again. Check if status icons are still readable, the camera stays unobstructed, and tapping expands the pill.
5. If the system clips the island or it obscures system UI, choose **Below status bar**, save and preview. This is the reliable fallback.
6. Test on home screen and in another app, with notification permission and Do Not Disturb, with screen locked, and after reboot. No overlay should persist beyond ~14 seconds.
7. Check Daymark's Off/Subtle/Balanced/Strong haptic options and v0.4 swipe gestures for regressions.

## Install (VS Code PowerShell at Daymark expressive project root)
```powershell
cd "D:\Downloads\daymark-insforge-todo\daymark-expressive"
git status --short
git fetch origin
git switch -c preview/island-camera --track origin/fix/v0.5-island-camera-alignment
npm ci
npm test
npm run build
npx cap sync android
npx cap open android
```

If the branch already exists: `git switch preview/island-camera` then `git pull --ff-only`. Do not discard modified Gradle files; stash them first and preserve your stash.

No production deploy, main merge, or Google Play release.
