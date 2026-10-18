# Daymark Island Motion Studio · v0.8.4 preview QA

**Status:** Native animation enhancement, draft feature branch based on `fix/v0.8.3-compact-auth-screens`. No main merge, production deployment, new runtime dependency, or backend/database migration.

## Feature details

The Island reminder overlay is an **Android WindowManager** View, not a DOM component. This release upgrades four moments with the analytical solution to a damped harmonic oscillator (native Java `ValueAnimator`):

1. **Entrance:** bud grows from a small rounded pill, fades and moves into place.
2. **Expand:** tap a compact Island to expand smoothly; width, corner radius and details height change together. Actions fade into place.
3. **Collapse:** tap again to compact the Island; content contracts smoothly rather than vanishing abruptly.
4. **Exit:** swipe sideways, tap Dismiss, or let the 14-second timer expire; overlay contracts/fades and closes. Swipe exits translate in the swipe direction.

### Selectable styles

| Style | Behavior |
| --- | --- |
| Spring Flow | Balanced damped movement, default for all Android manufacturers |
| Fruit Bloom | Organic bud-to-fruit expansion with soft squash and settling |
| Elastic Pop | Expressive playful overshoot |
| Silk Glide | Almost critically damped, minimal bounce |

Profiles differ in damping ratio, frequency, opening scale, radius, expand/collapse duration and exit timing. They are stored only on this device in existing `IslandReminders` preferences; they do not require an account or cloud permission.

**Motion safety:** Honors `ValueAnimator.areAnimatorsEnabled()` on Android 8+, the animation-scale global setting on Android 7, and Daymark's own Less motion toggle through a new native Capacitor bridge. Animations can be canceled mid-flight when the service is destroyed, the overlay is denied, or another reminder replaces it. The user can still interact with all reminder actions.

## Where to find it

Open Daymark → **Personalize** → **Daymark Island** → **Island Motion Studio**. Tap one of the four style cards to save it locally; use **Replay motion sample** to see an in-app illustration, or enable Floating Island, grant Display over other apps and tap **Preview Island** to test the real native animation. Preview does not modify scheduled task reminders.

## Device QA plan

1. Android API 24–36 (7–16 baseline) with phones/emulators from different OEMs; never assume a Pixel-only camera location.
2. Floating Island disabled by default, no unexpected permission prompt when choosing style; standard notifications continue working.
3. With overlay permission granted, preview Spring Flow. Confirm entrance, tap expand, tap collapse, swipe to dismiss, and timer-driven exit (~14s).
4. Repeat with Fruit Bloom, Elastic Pop and Silk Glide. Compare expansion, collapse and exit. Confirm no hard snap, large jump, off-screen placement or black strip; content remains readable.
5. During expand animation, tap again to collapse; reverse immediately; ensure no ghost window, stuck alpha, crash or missing Snooze/Open/Dismiss.
6. Tap **Snooze 10m** and ensure a reminder is actually rescheduled; **Open task** opens app; Dismiss removes overlay; swipe still works.
7. Turn off Floating Island while preview is visible → service immediately closes, no reappearing view. Standard notifications unaffected.
8. Turn off Android animations (Settings → Accessibility / Developer options) and Daymark Less motion independently; overlay should change state instantly with no spring.
9. Test camera aligned vs below-status-bar mode, horizontal alignment offset, screen rotations, 320dp–large display sizes; actual cutout coverage is Android/OEM controlled.
10. Deny Display over other apps and verify no floating overlay, normal notification still delivered.
11. Test low-power/Doze and Android 14+ foreground-service restrictions; notification timing is inexact and is independent of Island visuals.
12. Test dark/light theme, text magnification, screen reader accessibility descriptions and touch feedback off/subtle/strong.
13. Confirm styles persist after app process restart and device reboot.

### Known limitations

- Third-party Android apps **cannot control the OS status bar or hardware camera cutout**, nor guarantee drawing on top of it.
- Native overlay requires Android's optional Display over other apps permission and may be limited by OEM policies and background launch restrictions.
- The in-app Motion Studio sample is illustrative; the real animation is the native Preview Island overlay.
- Spring timing differs slightly with device refresh rate and Android animation-duration-scale settings.
- Scheduled alerts remain inexact, with standard notifications as the primary delivery fallback.
- This is a native UI upgrade; no new Capacitor/motion packages or service permissions.

## Installation, without disturbing local migrations

In **VS Code PowerShell**, in the dedicated Daymark worktree:
```powershell
cd "D:\Downloads\daymark-insforge-todo\daymark-onboarding"
git status --short
git fetch origin
git switch -c preview/v084-island --track origin/feat/v0.8.4-island-motion-studio
npm ci
npm test
npm run build
npx cap sync android
npx cap open android
```
If `preview/v084-island` already exists, use `git switch preview/v084-island` and `git pull --ff-only` instead. Preserve local modifications if status is not clean.

In **Android Studio** open `daymark-onboarding\android`, select your device, and Run ▶. The app must be reinstalled to receive updated native `.java` code; a browser refresh won't update the native overlay.
