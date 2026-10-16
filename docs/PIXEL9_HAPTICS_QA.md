# Daymark — Pixel 9 Native Haptics and Expressive UI QA

**Branch:** `feat/pixel9-native-haptics-ui`  
**Scope:** Capacitor Android baseline + PR #1 Smart Task Entry + PR #2 Expressive UI + PR #3 tactile preferences + direct official native Capacitor Haptics integration and refinement.

## What this implements

- Direct **`@capacitor/haptics`** plugin import and calls, guarded by `Capacitor.isNativePlatform()`.
- Six semantic interactions: **selection**, **action**, **success**, **complete**, **warning**, **error**.
- Local user setting: **Off / Subtle / Balanced / Strong**, with an interactive Test Feedback control in **Personalize**.
- Device-level preferences are respected. Android / Pixel vibration amplitudes are hardware- and OS-dependent; strength settings choose lighter/heavier impact styles rather than controlling motor amplitude.
- Motion feedback only after deliberate actions, not during scrolling, render, network polling or typing individual characters.
- React + Capacitor 8 modern Android SystemBars configuration (CSS safe area insets), viewport-fit cover, and light/dark icon contrast.
- Improved touch target sizes, mobile nav active shapes, safe-area spacing around bottom navigation, floating create button, task sheet and toasts.
- No new npm dependencies; the Android baseline already includes `@capacitor/haptics`, `@capacitor/core` and `@capacitor/android` at matching major versions.
- No InsForge database schema or credentials changes.

## Run on Pixel 9

### VS Code terminal (project root, NOT the `android/` directory)

Close any Vite dev servers before dependency installation (avoid `esbuild.exe` Windows EPERM errors).

```powershell
git status --short
git fetch origin
git switch -c preview/pixel9-haptics --track origin/feat/pixel9-native-haptics-ui
npm ci
npm test
npm run build
npx cap sync android
npx cap open android
```

The branch contains the real Android baseline and all upstream feature PRs, so it can run in its own worktree.

### Android Studio

1. Ensure the Android project opened is `daymark-expressive/android` from this branch, **not** your original `daymark-insforge/android` window.
2. Select **Google Pixel 9** and the **app** run configuration.
3. Click **Run** to install the update. It uses `com.piyush.daymark`, so the Android debug app may be updated in place.
4. Test in **Demo Mode** first. To test cloud data, configure a local `.env` in the worktree with only the public InsForge frontend values (never commit secrets).

## Manual tactile QA

| Interaction | Expected cue |
| --- | --- |
| Navigate between bottom tabs | Light selection tick |
| Open a task or press add | Action impact |
| Create/edit task successfully | Success feedback after completion |
| Complete a task | Distinct completion cue (strong/balanced: impact then success) |
| Mark a completed task incomplete | Selection feedback |
| Confirm task deletion | Warning feedback after deletion |
| Failed backend operation | Error notification cue |
| Apply Smart Task Entry suggestion | Success feedback |
| Change palette or theme | Selection cue |
| Off setting | Absolutely no haptics from Daymark |
| Reduced motion | Animations minimized, tactile setting remains independent |

Try **Subtle**, **Balanced**, then **Strong** in the sparkle **Personalize** panel. Depending on Android's system haptics setting, some variants may feel similar. Try enabling haptic feedback in Pixel Settings if no vibration is perceived. Test on actual hardware; Android Studio mirroring does not play vibration on the laptop.

## UI QA
- No overlapping status bar, nav bar or task controls in portrait or landscape.
- Task sheet and floating button remain clear of the gesture navigation bar.
- Modal date/priority inputs are accessible with the keyboard.
- Select all four color stories in light and dark modes.
- Reduced Motion / system animation scale preferences work.
- Smart input recognizes `Go to gym tomorrow !high` and updates fields **only after Apply**.

## Known boundaries
- This change does **not** implement dynamic Material You wallpaper colors, a Kotlin amplitude-level vibration composer, background reminders, or offline syncing. Those are follow-up projects.
- Capacitor's public Haptics plugin is not a precision vibration motor controller; distinct profiles are best-effort platform patterns.
- Android native behavior needs the owner's Pixel 9 for end-to-end validation; GitHub CI validates unit tests and Vite build, **not Android hardware**.
- No automatic InsForge deployment or Play Store release is performed by merging this PR.


## Pixel-tuned haptics v2
- Replaces multi-pulse Capacitor effects and navigator.vibrate() with a custom Java plugin, DaymarkHaptics, registered in MainActivity.
- For normal touches, uses action-based Android View.performHapticFeedback constants, honoring Android's global Touch feedback setting.
- For important Strong-mode touches, only uses OEM-tuned VibrationEffect.EFFECT_HEAVY_CLICK when native hardware support is confirmed. Otherwise system feedback/silence; never fallback to generic buzz.
- 55ms rate-limit protects against rapid redundant haptics. Background interactions and disabled settings are silent.
- The Personalize panel offers **Soft tick**, **Button click**, and **Task done** to compare nuanced feedback.
- Native Java Gradle build is included in GitHub Actions; physical Pixel 9 test remains required.

Sources: https://developer.android.com/develop/ui/views/haptics/haptics-apis , https://developer.android.com/develop/ui/views/haptics/haptics-principles , https://capacitorjs.com/docs/android/custom-code
