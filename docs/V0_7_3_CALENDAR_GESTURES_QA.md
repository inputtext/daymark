# Daymark v0.7.3 — Calendar Edit/Delete Gestures

Draft, stacked on v0.7.2; no merge to main and no InsForge deployment/migration.

## What changes
- **Daily Timeline:** swipe task card left to reveal **Edit** and **Delete** icon buttons with spring motion and a native selection tick.
- A **More actions** icon provides the same controls without requiring a swipe. Escape or tapping away closes the controls.
- Swipe alone is NON-DESTRUCTIVE: Delete only runs when the explicit trash button is tapped.
- **Edit task modal:** add a visibly labeled **Delete task** button, shown only when editing an existing task (not when creating).
- Both paths reuse the same application-level delete function with a confirmation dialog; cancel keeps the task; database errors leave the task in place and report an error.
- After confirmed successful deletion, both previously scheduled manual and date-time Android reminders are canceled on this device.
- Calendar mouse drag-to-reschedule moves to a dedicated desktop drag handle to avoid conflicting with horizontal touch swipe. Mobile rescheduling continues via **Move date** picker.
- Existing v0.4 main task gestures and Notes are untouched; standard task edit and cloud storage flow retained.

## Pixel 9 QA matrix
1. Calendar → choose a date with tasks → swipe left on a timeline card. Both Edit/Delete icons appear.
2. Tap Edit icon → opens existing task form. Tap Delete task → confirm → task disappears from Calendar and All tasks.
3. Open Edit again for another task → Delete task → Cancel → task remains.
4. Tap More actions icon instead of swiping → edit and delete controls appear for accessibility.
5. Swipe right or tap another area → revealed controls close. No deletion occurs from a swipe.
6. Open a task whose date/time reminder is enabled; delete it; the native Android reminder should be canceled.
7. Tap Move date and choose a new date; task moves and its opted-in reminder re-registers where permitted.
8. In demo mode and cloud mode, verify deletion persists after refreshing/relaunching.
9. Test haptics at Off and Balanced, light/dark palettes, reduced motion, screenreader controls, and task title with long text.
10. On a desktop browser, use the drag handle to drop a task onto a calendar date. On mobile, use Move date to reschedule.

## Pull/install (VS Code PowerShell)
```powershell
cd "D:\Downloads\daymark-insforge-todo\daymark-expressive"
git status --short
# If generated Android files changed:
git stash push -u -m "Android local changes before calendar swipe actions"
git fetch origin
git switch -c preview/calendar-swipe --track origin/feat/v0.7.3-calendar-swipe-actions
npm ci
npm test
npm run build
npx cap sync android
npx cap open android
```
If the local preview branch already exists, run `git switch preview/calendar-swipe` and `git pull --ff-only`.

In Android Studio open the `daymark-expressive\android` directory, select your Pixel 9, then Run ▶.

No code changes are deployed to the InsForge-hosted website or the database automatically.
