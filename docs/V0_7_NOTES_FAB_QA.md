# Daymark v0.7 — Quick Notes and Expressive FAB (Pixel 9 QA)

**Experimental draft PR.** Stacked on v0.6.1 Calendar Haptics. No changes to \`main\`, production, Android permissions, or InsForge database.

## What's new
- **Notes** destination in sidebar and mobile bottom nav; "Completed" remains available in sidebar but is removed from the crowded five-item bottom nav (Home, Today, Upcoming, Calendar, Notes).
- **Instant Quick Note** from a bottom-right multi-action FAB, Notes page, or keyboard \`Q\` shortcut when not typing.
- **Thumb swipe:** swipe **left on the floating + button** to open a Quick Note immediately. Swipe **up on the + button** to expand the action menu; tap + to toggle. Gestures are scoped to the FAB instead of the OS screen edge, avoiding conflicts with Android's back gesture and v0.4 task swipes.
- Expandable FAB is inspired by the Material 3 Expressive FAB menu: spring entrance/exit, gently staggered action buttons, icon-backed chips, rotating +, and native Daymark selection/action haptics.
- FAB actions: **Quick note**, **New task**, **All notes**.
- Quick note is a bottom sheet with immediate content focus, title/body editing, pin, Done and escape/tap-outside dismissal. **Autosave every edit**; an empty, abandoned new draft is not stored.
- Notes shelf: title, excerpts, last edit date, pin/unpin, search, delete with confirmation, and expressive card transitions.
- Offline-first notes stored using a per-workspace \`localStorage\` key; demo notes separate from signed-in user notes. User-owned tasks and Island behavior unchanged.

## Important limitation
These notes are **device-local only**, even if a user has signed in to InsForge; they are **not synced between the browser and Android, or between devices**. They are not end-to-end encrypted. Clearing app storage or uninstalling the app can delete notes. Back up important notes independently. Cloud notes with RLS + careful migration should be planned as a follow-up before calling the app production-ready.

## Physical Pixel 9 QA matrix

| Test | Expected |
|---|---|
| Tap floating + | Expanded menu springs upward; + rotates; Quick note, New task, All notes all visible |
| Swipe FAB left | Opens Quick Note without opening menu or triggering a task's swipe |
| Swipe FAB upward | Shows menu; short taps and scrolling outside FAB remain unaffected |
| Tap Quick note | Bottom sheet opens and body is focused so typing can begin immediately |
| Type and close | Note stays saved; reopen via Notes tab and edit again |
| Open new empty note and close | No blank card left in Notes |
| Pin/unpin and search | Pins order first; search filters title and body; updates are immediate |
| Delete note | Asks confirmation; Cancel preserves note |
| Keyboard Q (not editing) | Opens Quick Note; in a text field, Q just types Q |
| Touch Feedback Off | No Daymark haptic feedback on FAB actions |
| Feedback Balanced/Strong | Intentional selection/action ticks, not repeated buzzing |
| Reduced motion | Transitions reduced/disabled, functions unchanged |
| Dark and color palettes | Readable chips and controls; no text clipping |
| Back/Android gesture | OS edge navigation and native task swipes still work |
| Existing features | Task CRUD, Calendar pickers, notifications, Island, sign-in |
| Sign out / demo / other user | Notes remain scoped to their local workspace, not exposed to other users |
| Android orientation/keyboard | Sheet remains above keyboard and footer accessible; no accidental close |

## Pull on Windows

**VS Code PowerShell terminal** in \`D:\Downloads\daymark-insforge-todo\daymark-expressive\`:

\`\`\`powershell
git status --short
# Only if generated Android Studio files are modified/untracked:
git stash push -u -m "Local Android files before Daymark Notes FAB"
git fetch origin
git switch -c preview/quick-notes --track origin/feat/v0.7-quick-notes-fab
npm ci
npm test
npm run build
npx cap sync android
npx cap open android
\`\`\`

For an existing local branch: \`git switch preview/quick-notes\` and \`git pull --ff-only\`.

**Android Studio:** select the physical Pixel 9 and click Run ▶ \`app\`. This must be tested on-device; web CI can only verify tests, production compilation, and Android Gradle debug build.

## Design reference
Material 3 Expressive-style FAB menu (user-supplied visual): stacked vertically pill buttons plus expanding/rotating trigger. This is a custom React implementation, not a Google-hosted Compose component.
