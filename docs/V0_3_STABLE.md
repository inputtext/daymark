# Daymark v0.3 — Pixel 9 verified baseline

This is a **stability checkpoint** for the owner's tested Android app before starting v0.4 gestures.

## Immutable functional baseline

Base commit: `1563a7b62bd7e15b82eb7011c530fd00ac2243a4` (crisp native haptics).

- Offline smart task entry and current InsForge / demo task CRUD.
- Material 3 Expressive-inspired UI, mobile bottom navigation, palettes and reduced-motion preference.
- Native Capacitor 8 Android app `com.piyush.daymark`.
- Pixel 9 haptic engine: custom Java plugin using Android system-tuned `View.performHapticFeedback()` and optional OEM-optimized heavy-click when supported.
- User confirmed the native haptics feel correct on the physical Pixel 9.
- Android + React GitHub Actions run `38959611442`: **success** (Node unit tests, Vite build, Gradle `assembleDebug`).

## Safety

- This branch and v0.4 work are separated. Do not deploy or auto-merge to `main`.
- Preserve these working behaviors as regression criteria.
- To validate a future build: `npm ci && npm test && npm run build && npx cap sync android`, then open the `android/` project in Android Studio and Run on Pixel 9.
- A real-device gesture / accessibility pass remains necessary for v0.4.
- The preexisting stacked PRs (#1–#7) remain open; this checkpoint composes them. Do not merge conflicting/redundant stacked PRs blindly.

## Next

`feat/v0.4-premium-gestures` will be stacked on this checkpoint. It will introduce React WebView physics-based motion while reusing **exactly the same native haptics bridge**.
