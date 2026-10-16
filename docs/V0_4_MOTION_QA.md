# Daymark v0.4 — Premium Android motion and gestures

## Foundation and engine

- Base branch: `release/v0.3-pixel9-stable`, preserving the **Pixel 9-tested** native Java haptics bridge, InsForge CRUD, demo mode, smart task entry, and Material Expressive UI.
- Feature branch: `feat/v0.4-premium-gestures`.
- Animation engine: **Motion for React** (`motion/react`, v12) using physics-based springs, drag motion values, shared layout animations and enter/exit transitions.
- Runtime: React in Capacitor's Android WebView; these transforms are optimized by the browser renderer. We deliberately do not animate individual CSS pixels with repeated React state updates.
- No network CDN required: Motion is packaged into Vite's local `dist` assets.
- Haptic implementation stays unchanged: Android Java `DaymarkHapticsPlugin` called through `src/lib/haptics.js`.

## Interaction semantics

| Interaction | Behavior | Feedback |
|---|---|---|
| Swipe right across task | Completes or reopens task after reaching deliberate threshold | One preview tick at crossing, native completion on confirmed success |
| Swipe left across task | Spring-snap reveals **Edit** and **Delete** buttons; no automatic delete | Native selection tick |
| Long press (460 ms) | Context menu: complete, edit, today, tomorrow, delete | Native action tick |
| Mouse right-click or keyboard Enter on focused row | Same accessible context menu | Native action tick |
| Tap the existing task completion control | Spring checkmark then usual CRUD update | Native completion on success |
| Tab navigation | Shared spring indicator glides across bottom nav | Native selection tick |
| Task create/edit sheet | Backdrop fades, sheet springs into place | Existing native action / success |
| Appearance sheet and success toast | Controlled transitions | Existing native haptics |
| FAB press | Small spring compression | Existing native action |
| Task list changes | Position layout transitions | No extra haptics |

**Safety:** tasks are never deleted simply by swiping. Explicit Delete is still guarded by the pre-existing confirmation dialog. The swipe classifier (`src/lib/gestures.js`) is independently tested.

## Accessibility and performance

- **Reduced motion**: both Daymark's Gentle motion toggle and Android/browser `prefers-reduced-motion` disable nonessential transforms.
- **Vertical scrolling**: task surface uses `touch-action:pan-y` and horizontal-only drag; scroll gestures cancel pending long press.
- **No haptic buzz**: Motion drives visuals only; no duration waveforms, no `navigator.vibrate()`.
- **Keyboard**: tab to a row, Enter/Space opens its menu; Escape closes; visible More button is an alternative to long press.
- Task animations use compositor-friendly transforms and bounded springs. Exact frame rate needs real-device profiling; CI compilation is not a performance benchmark.
- Offline task mode and InsForge schema are unchanged.

## Local Pixel 9 QA

**VS Code terminal — from the `daymark-expressive` root (not `android/`)**:

```powershell
git status --short
git fetch origin
git switch -c preview/daymark-v04 --track origin/feat/v0.4-premium-gestures
npm ci
npm test
npm run build
npx cap sync android
npx cap open android
```

**Android Studio**: verify the opened project path ends in `daymark-expressive/android`, select your Pixel 9, then Run `app`.

Test at least:
1. With 20+ tasks, scroll vertically. No accidental completions or context menus.
2. Swipe right to complete and left to reveal Edit/Delete; confirm Delete prompts before mutation.
3. Long press / mouse right-click / keyboard Enter on task: action menu appears; tap Today / Tomorrow and confirm due date.
4. Tap and edit task, close modal, re-open. No stale fields or sync regression.
5. Change nav tabs repeatedly; indicator follows without jank and preserves task counters.
6. Use Off / Subtle / Balanced / Strong in Personalize: native Pixel tactile character remains intact.
7. Enable Daymark Reduced motion and Android Remove animations. Main task operations remain usable.
8. Dark/light themes, small screens and soft keyboard don't obscure menu or task sheet.

## Official references
- Motion for React: https://motion.dev/docs/react
- React drag: https://motion.dev/docs/react-drag
- Motion values: https://motion.dev/docs/react-motion-value
- Android haptics: https://developer.android.com/develop/ui/views/haptics/haptics-principles

No `main` merge or production InsForge deploy is performed automatically.

### GSAP comparison
GSAP can also animate React DOM elements in an Android Capacitor WebView. Daymark v0.4 chooses Motion for React because touch drag, spring transitions, shared layout and stateful component lifecycles are integrated directly. We avoid installing two animation engines unnecessarily.
