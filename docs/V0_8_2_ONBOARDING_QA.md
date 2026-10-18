# Daymark v0.8.2 — Expressive first-run onboarding

Draft stacked on v0.8.1 mobile viewport fix; no merge, backend migration, or deployment.

## New entry flow
- Loading → InsForge checks `getCurrentUser()` → already signed in: existing workspace / biometric app lock.
- Signed out and first launch: four-stage interactive onboarding.
- **Skip** or **Get started** persists only `daymark:onboarding:v1=done` in local storage and opens the existing InsForge Sign in / Create account screen.
- Users who completed onboarding or previously signed in see the existing auth screen directly after signing out.
- **Explore demo** remains on the existing auth screen. No account or backend changes.
- UI components are original React + motion/CSS implementations based on Material 3 design patterns (filled/tonal buttons, cards, chips, progress indicator, rounded shapes), not imported native Compose components or website screenshots.

## Slides
1. Welcome — morphing flower and message.
2. Tasks & calendar — task list + interactive check/uncheck demo (no user data saved).
3. Quick Notes — floating cards and offline/cloud copy.
4. Reminders & optional app lock — notification, fingerprint/device PIN privacy.

## Motion, navigation and accessibility
- Manual Continue / Back / Skip, tappable progress indicators, left/right arrow keys and horizontal swipes.
- Spring entrance, petal/orbit animation, floating cards. Respects OS reduced-motion and Daymark reduced-motion setting.
- No notifications, biometric permissions, camera, location, or cloud access requested during onboarding.
- Good touch sizes, semantic buttons, `aria-current`, accessible skip.
- Uses Daymark's theme variables, with responsive design for 320px to tablet/desktop, native Android safe-area padding, avoids lateral overflow.

## Manual QA
1. Fresh `localStorage` or app installation, without session: see Welcome first. Advance four stages and reach existing auth.
2. Skip from stage 1/2/3/4: auth appears immediately. Close/reopen: onboarding does not reappear.
3. Active InsForge session: skip onboarding entirely, show app lock if enabled.
4. Sign out after authenticated app upgrade: auth screen appears, not onboarding.
5. Offline mode and unconfigured InsForge: onboarding still works, then demo.
6. Demo local data and existing user Notes remain untouched.
7. Stage 2 interactive task check only changes mock UI, not saved tasks.
8. Horizontal swipe, arrow keys, Back, stage progress taps, reduced motion and screen reader.
9. Screen widths 320/360/393/412/480/768 and desktop, Android 7–16: no sideways white strip or clipped controls.
10. Compare light/dark palette, phone landscape, accessibility font size 150%+, keyboard focus states.
11. Android Studio: verify app retains InsForge sign-in and does not show onboarding on every cold start.

## Testing in VS Code PowerShell
```powershell
cd "D:\Downloads\daymark-insforge-todo\daymark-expressive"
git status --short
git fetch origin
git switch -c preview/v082-onboarding --track origin/feat/v0.8.2-expressive-onboarding
npm ci
npm test
npm run build
npx cap sync android
npx cap open android
```
If preview branch exists: `git switch preview/v082-onboarding` then `git pull --ff-only`.
Android Studio: open `daymark-expressive\android` project, select device, Run ▶.

## Retrigger for testing (do not clear all app storage)
With remote debugging / DevTools connected to the Android WebView or in browser DevTools:
```js
localStorage.removeItem('daymark:onboarding:v1')
```
Then sign out or reload while signed out. This flag is distinct from Notes, cloud auth sessions and task storage. Do **not** use Android Clear Storage to test this because it can delete offline Notes.

## References
- https://m3.material.io/components/buttons/overview
- https://m3.material.io/components/cards/overview
- https://m3.material.io/components/progress-indicators/overview
- https://m3.material.io/components/chips/overview
