# Daymark v0.6 — Expressive Calendar

**Status:** experimental, stacked on `feat/v0.5.3-island-reliability`. Do not merge to `main` or deploy until reviewed and tested on Pixel 9.

## Implemented
- Dedicated **Calendar** navigation in sidebar and mobile bottom bar; accessible Month, Week and Day modes.
- Responsive calendar grid with today highlighting, date selection, per-day task counts, month/week navigation, and animated selection/transition using the existing Motion for React spring system.
- **Daily Timeline** with Morning, Afternoon, Evening and Anytime groups, priority indicators, task editing and one-click task creation on selected day.
- **Drag-to-reschedule**: mouse HTML drag/drop onto dates; touch pointer release onto a date; non-drag accessible **Move…** select fallback. No automatic task deletion or completion. Cloud moves update InsForge; demo moves persist to localStorage.
- Custom **Material 3-inspired date picker**: month grid, selected-date header, typed date input toggle, Clear/Cancel/OK, Escape dismissal.
- Custom **Material 3-inspired time picker**: 12-hour clock dial, AM/PM, hour/minute selection, keyboard number input toggle, Clear/Cancel/OK.
- Date/time controls in task create/edit modal, responsive light/dark/palette styling, reduced-motion support.
- Local calendar date math uses noon-based construction, avoiding UTC date drift across timezones.
- No additional runtime npm dependencies. No changes to native Pixel haptics, Android permissions, or Island services.

## Important distinction
The supplied [Material date picker](https://m3.material.io/components/date-pickers/overview) and [time picker](https://m3.material.io/components/time-pickers/overview) pages are **design guidance**, not installable React component packages. Daymark is React/Capacitor, so this implementation follows the Material 3 interaction patterns using custom React components. It is **not** Google's native Jetpack Compose `DatePicker`/`TimePicker` implementation.

## Cloud migration — only needed for time of day
The existing tasks schema has `due_date` but **no `due_time`**. Run `migrations/20261017_add_due_time.sql` once in your **InsForge SQL editor** to persist optional time values for cloud users. The migration is additive and preserves existing tasks and RLS policies.

Until that migration is applied, cloud date-only tasks and calendar moves still work via the existing schema fallback; attempts to save a nonempty task time show a migration-required error instead of silently discarding the value. Demo mode stores `due_time` in localStorage immediately. This is an optional **task time**, not a scheduled Android alarm or automatic Island reminder. Future versions can connect calendar times to notification scheduling.

## Test matrix (Pixel 9 + browser)
1. Calendar tab appears in sidebar and bottom navigation. Test Month/Week/Day; dates and task counts match.
2. Choose today, tomorrow and dates across Dec 31/Jan 1; selected date and tasks should remain correct in local timezone.
3. Add a task from a selected day, choose date with picker, time with dial (9:30 AM), save; edit and verify values persist.
4. Switch time picker to keyboard mode and type 12:00 AM, 12:00 PM, 11:59 PM. Clear date and time.
5. Reschedule a task by dragging onto another date; use **Move…** dropdown as accessible fallback. Refresh and verify persistence.
6. Test no tasks, many tasks, completed tasks, light/dark themes, all color palettes, reduced motion and narrow Pixel 9 viewport.
7. In cloud mode, test both **before** and **after** applying optional `due_time` migration. Ensure missing-column fallback works.
8. Confirm v0.4 swipe actions, native haptics and v0.5 Island preview/notifications still work.

## Pull and test
**VS Code PowerShell terminal**, in `D:\Downloads\daymark-insforge-todo\daymark-expressive`:

```powershell
git status --short
git fetch origin
git switch -c preview/expressive-calendar --track origin/feat/v0.6-expressive-calendar
npm ci
npm test
npm run build
npx cap sync android
npx cap open android
```

If the working tree has generated Android Gradle files, first run `git stash push -u -m "Local Android files before v0.6"`. If the preview branch already exists, use `git switch preview/expressive-calendar` then `git pull --ff-only`.

**Android Studio:** choose the connected Pixel 9, then Run ▶ app. CI runs JavaScript tests, Vite build and native Gradle debug APK compilation, but physical touch behavior must be verified on hardware.
