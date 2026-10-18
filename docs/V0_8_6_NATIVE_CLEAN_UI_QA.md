# Daymark v0.8.6 — Minimal native Android UX

**Draft stacked on v0.8.5**. No changes to auth, notes storage/sync, alarms, animations, permissions, InsForge, or database schema.

## What changes in the Android APK only
- Removes the topbar breadcrumb "Workspace / All tasks" (bottom bar/sidebar show current view).
- Removes the decorative "A FRESH PERSPECTIVE" eyebrow and page subtitle.
- Gives Tasks/Today/Upcoming/Completed concise page titles from navigation.
- Keeps a compact Notes heading inside the Notes screen and the actual month/day heading in Calendar; removes the duplicate global page heading.
- Hides decorative "THOUGHTS WORTH KEEPING", "YOUR TIME, BEAUTIFULLY ORGANIZED", "DAILY TIMELINE", Notes prose, decorative sidebar tip, redundant page/new-task button and footer slogan.
- Shows tasks/search/filter immediately; puts a concise task-progress summary and useful three statistic shortcuts below the task list on All tasks.
- Reduces the size of the Notes introductory card while retaining counts, pinned status, Quick note, search and cloud status.
- Removes the permanent gesture hints. A tappable "Task gestures" / "Calendar actions" disclosure retains discoverable instructions.
- Hides Cmd+K badge and "Press N /" shortcuts and does **not register global productivity keyboard shortcuts** in the native Android app.
- Keeps the website **unchanged**: full page headings, copy, welcome hero, main add-task button, Ctrl/Cmd+K, N, Q, / shortcuts, gesture instructions, footer and search shortcut badges.

## Important text we deliberately kept
- Sign in/Create account, mandatory first-run onboarding and tutorial replay; native app lock and sign-out.
- Field labels and validation; permissions and Island/biometric settings.
- Cloud Notes sync, offline, retry, local-data warning and error messages.
- Calendar month/day, date/time and Move date controls, swipe confirmation, empty-state instructions.
- Task priorities, labels, count, filters, empty-state messages and accessible button descriptions.
- Modal focus trap, Escape to close, Arrow keys for calendar navigation **as accessibility features**, not global productivity shortcuts.

## QA
1. Build/install Android APK. **All tasks:** topbar has menu and actions but no breadcrumb; h1 only "All tasks"; no "A FRESH PERSPECTIVE". Tasks and search first, progress/stat shortcuts below. No Cmd K badge; gesture instructions available from "Task gestures".
2. Tap Today, Upcoming, Completed (in sidebar). Clear title, task count, controls; no promotional hero copy repeated.
3. Notes: one title, concise Quick note, notes and pinned count, search, notes grid, synced/offline errors remain.
4. Calendar: month/day selector, navigation, selected date, task actions, reschedule and Add task are still visible. Tap "Calendar actions" for instructions.
5. Sidebar: workspace/navigation/quick access and account footer still accessible; decorative sidebar card hidden.
6. Personalize: theme, haptics, motion, Floating Island presets, overlays and their useful descriptions still visible. No Pixel-only wording.
7. Keyboard: on native Android with connected Bluetooth keyboard, Ctrl+K, N, Q and / do not launch actions globally; inside fields typing works normally. Dialog Escape/Tab focus and calendar keyboard accessibility remain.
8. Desktop website at >900px: breadcrumbs, typography, hero, keyboard hints, shortcuts and complete dashboard unchanged. Also test browser on narrow viewport (not native): browser features remain available.
9. 320, 360, 375, 393, 412, 480dp and Android tablets, zoomed text, landscape: no horizontal overflow, no clipped FAB, proper tap targets.
10. Night/light theme, online/offline, guest/demo/cloud, biometric lock, pending notes, reminders, reduced motion, font scaling.
11. Verify original synced tasks, Notes and reminders survive upgrade. No migrations needed.

## Install from VS Code PowerShell
```powershell
cd "D:\Downloads\daymark-insforge-todo\daymark-onboarding"
git status --short
git fetch origin
git switch -c preview/v086-clean --track origin/feat/v0.8.6-native-mobile-ui-cleanup
npm ci
npm test
npm run build
npx cap sync android
npx cap open android
```
If `preview/v086-clean` already exists, use `git switch preview/v086-clean` and `git pull --ff-only`. **Preserve local changes before switching.**

In Android Studio open `daymark-onboarding\android`, select any supported Android device, click **Run ▶**. Native UI is decided by Capacitor platform (not viewport size), so the Vite browser build will still display the desktop/web experience.
