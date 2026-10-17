# Daymark v0.7.4 — Mobile sidebar account access fix

Stacked draft on v0.7.3, no merge to main or deployment.

## Root cause
- Mobile bottom nav uses z-index 40 and FAB z-index 45; the sidebar used z-index 30.
- Sidebar had fixed 100vh height with long navigation + promo card + footer; no scrollable content region. Account/logout footer was outside visible phone height.
- The Pixel 9 screenshot showed only the top of the footer below the navigation bar.

## Fix
- Move menu links, quick access, and promo card into a separate scrollable flex child (`sidebar-scroll`).
- Keep account footer as a non-scrolling flex child; make button 58px minimum height and label action explicitly: **Exit demo · Sign in** or **Sign out of account**.
- On mobile, raise sidebar to z-index 90, dim to 60, above bottom nav/FAB. Respect Capacitor safe-area top/bottom insets and dynamic viewport height.
- No storage, authentication, task, Notes, reminder, or database changes.

## Pixel 9 QA
1. Open sidebar on any view, portrait. Account footer visible above Android gesture bar and bottom nav hidden behind drawer.
2. Tap **Demo workspace — Exit demo · Sign in**. Welcome page appears. Local demo tasks and Notes must remain stored, not wiped.
3. If InsForge configured, check Sign in / Create account tabs; sign in, reopen drawer, tap **Sign out of account**. Welcome page appears.
4. Try scrolling menu links while footer stays visible; open Completed, Notes, Calendar. Close via X or dimmed backdrop.
5. Check font scaling 150%+, landscape, dark/light theme, and reduced motion.
6. Verify bottom navigation and FAB work after closing sidebar.
7. Confirm sign-out network error leaves session intact and shows a toast; don't clear app data.
8. Inspect GitHub Actions CI and install on actual Pixel 9 before merge.

## Install
VS Code PowerShell:
```powershell
cd "D:\Downloads\daymark-insforge-todo\daymark-expressive"
git status --short
# Only if local modified/untracked files: git stash push -u -m "Local Android before v0.7.4"
git fetch origin
git switch -c preview/sidebar-account --track origin/fix/v0.7.4-mobile-sidebar-account-access
npm ci
npm test
npm run build
npx cap sync android
npx cap open android
```
If `preview/sidebar-account` exists: `git switch preview/sidebar-account` then `git pull --ff-only`.
Android Studio: open `daymark-expressive\android`, select Pixel 9, Run ▶.
