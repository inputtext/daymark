# Daymark v0.8.3 — Compact account entry

**Draft**, stacked on `feat/v0.8.2-expressive-onboarding`. No merge, deployment, backend migration, or account data edits.

## What changed
- Removed repetitive eyebrow, subtitle, divider, footnote and decorative corner copy on Sign in / Create account.
- Sign in header becomes **Welcome back.**, sign-up header remains **Create your space**.
- Preserved both InsForge tabs and all existing email/password and verification actions.
- Kept **Explore demo** and a smaller **View intro** action, to replay mandatory onboarding while signed out.
- Compact expressive rounded text fields/buttons and spacing, placed within Android safe-area-aware dynamic viewport.
- Email verification retains its necessary instructions and Back to sign in.
- **Never** globally suppress scrolling: small phones, font magnification, error banners and the open keyboard may still require scrolling.

## UI QA
1. Android display widths 320, 360, 375, 393, 412, 480 CSS px; 700–800px tablet and large desktop.
2. At usual screen heights (~690 CSS px and up), both tabs' entire auth form, submit, Explore demo and View intro are visible without scrolling.
3. At short viewport / landscape / Android large text / keyboard open, all fields/buttons remain accessible by vertical scrolling.
4. Sign-up name, email, password required; sign-in email/password and email OTP verified through tested InsForge backend.
5. Wrong email/password error appears without hiding Submit.
6. Tab switch retains inputs, including name, but clears old errors.
7. Reduced motion, light/dark, Android 7–16 support baseline, different OEMs.
8. Return to required onboarding from View intro without clearing local Notes.
9. New user still must complete all four onboarding stages before reaching auth, unless they have a preexisting authenticated session.
10. With InsForge unconfigured, demo and intro available, settings note visible.

## Install
**VS Code PowerShell**
```powershell
cd "D:\Downloads\daymark-insforge-todo\daymark-onboarding"
git status --short
git fetch origin
git switch -c preview/v083-auth --track origin/fix/v0.8.3-compact-auth-screens
npm ci
npm test
npm run build
npx cap sync android
npx cap open android
```
If the branch already exists use `git switch preview/v083-auth` and `git pull --ff-only` instead. If local files are dirty, preserve intended changes first.
**Android Studio:** select device in `daymark-onboarding\android`, click Run ▶.
