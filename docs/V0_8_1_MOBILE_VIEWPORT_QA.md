# v0.8.1 — Mobile viewport overflow fix

Stacked draft on v0.8, no merge or deployment.

## Reproduction
On a narrow Android WebView (screenshot supplied at 11:30), topbar has six visual items: menu, breadcrumb, appearance, theme, standalone Wi-Fi indicator, avatar. The extra chip pushes content horizontally, revealing a light strip at the right edge.

## Changes
- Preserve online/offline indicator but integrate it as a tiny badge on the profile avatar at mobile widths <=700px.
- Keep desktop network chip unchanged.
- Shrink mobile topbar spacing and icon sizes to fit narrow devices.
- Set min-width:0 on flex children, constrain content to viewport and clip only unintended horizontal overflow.
- Preserve Notes, task data, InsForge auth, biometric lock, FAB, bottom navigation, and existing animations.

## QA on multiple devices
1. Android WebView 320, 360, 375, 393, 412, 480 CSS px and 150% font scale: no sideways page scroll or white strip.
2. Header icons and breadcrumb remain visible and tappable. At <=340px theme shortcut hides but appearance personalization remains available.
3. Avatar shows Wi-Fi badge online and offline badge in airplane mode.
4. Verify task list, Notes, Calendar, modal, FAB and bottom nav do not overflow.
5. Test landscape, dark/light, Samsung Internet / Chrome responsive mode, and at least two OEM Android phones.
6. Confirm v0.8 cloud sync and biometric unlock unaffected.

## Install (VS Code PowerShell)
```powershell
cd "D:\Downloads\daymark-insforge-todo\daymark-expressive"
git status --short
# If dirty, inspect first; optionally stash intended changes.
git fetch origin
git switch -c preview/v081-viewport --track origin/fix/v0.8.1-mobile-viewport-overflow
npm ci
npm test
npm run build
npx cap sync android
npx cap open android
```
Android Studio: select device and Run ▶.
