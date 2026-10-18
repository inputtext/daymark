# Daymark v0.9 · Smart Quick Add — offline, expressive floating composer

**Feature branch:** feat/v09-smart-quick-add, stacked on v0.8.6 mobile cleanup. Draft PR; no merge, deployment, backend changes, or new permissions.

## Features
- Floating Material 3 Expressive-inspired **Quick Add sheet**, launched from FAB → **Add a task** on Android and mobile web. Existing Edit task / advanced creation UI remains available through **More details** and other New task actions.
- Pure JS offline parser with injected local clock. Recognizes today, tomorrow, tonight, in N days, next week, weekdays / next Monday, October 28 / 28 Oct, ISO dates, 9 AM / 9:30 PM / 19:30, morning/afternoon/evening/night, !high/!medium/!low, urgent and high/low priority.
- Animated task title preview, date and time chips, clickable **Today / Tomorrow / 8 PM / High priority** chips, native date/time inputs for corrections, contextual examples and a reminder-preview card.
- Optional Android inexact notification at the **task's due time**, using the same saved task ID and native \`syncCalendarReminder\` path already used by the task editor. No overlay permission required for normal notifications. Notification permission requested only on explicit save if selected.
- Immediate demo task storage and InsForge cloud task creation use the existing \`saveTask\` logic. No duplicate task database.
- Offline parser always available; **cloud task creation still needs internet** (existing v0.8 limitation).
- Animated open/close spring and chip transitions; reduced motion, focus trap, Escape/cancel, form labels, warning status and viewport/safe-area constraints.

## Intentional safety boundaries
- The MVP does **not** support recurring tasks or early (e.g. 30-min-before) reminders. The parser flags those phrases and disables direct Quick Add save until they are removed. Use **More details** for supported advanced task options. Never silently mis-schedule an unsupported reminder.
- An ambiguous \`at 9\` does not assume AM or PM: enter an explicit time.
- Past due dates can still be saved as tasks, but a past due-time reminder is not scheduled.
- The due_time column in InsForge must exist (verified on the linked Daymark project earlier). This branch introduces no migrations.
- The widget feature will come **next**. Quick Add is the in-app floating composer, not yet an Android home-screen AppWidget.

## Manual QA on a supported Android device
1. Open Daymark while signed in/demo. Tap FAB (+) → Add a task. Observe original floating composer (NOT the old Edit Task modal). Test entrance spring, haptic response, reduced motion, closing on shade/Escape.
2. Type "Submit assignment tomorrow at 9 AM": title "Submit assignment", date tomorrow, 09:00, normal priority, preview at 9 AM. Save; a single task appears, cloud/demo correct. Android notification reminder permission requested only if enabled and needed.
3. Type "Call mom tonight": infer today 20:00. Explicitly review if 20:00 has passed (preview warns; no past reminder scheduled).
4. Test "Review project next Monday at 10 AM !high", "Pay rent 28 Oct", "Gym Friday 7:15 PM", "in 3 days".
5. Tap Tomorrow / 8 PM / High priority chips, edit date and time manually. Preview should update; date/time fields cannot trigger horizontal overflow at 320/360/393dp.
6. Type "Gym every Monday" and "Submit tomorrow at 9 AM remind 30 min before": show clear unsupported warning, block one-tap save (no silent wrong schedule).
7. Turn airplane mode ON (demo): parsing and saving demo task works. Signed-in cloud workspace: still parse but display offline warning; do not claim task queued.
8. Tap More details: opens existing advanced task modal prefilled with title/date/time/priority and reminder checkbox; saving goes through the original \`saveTask\`.
9. Cloud account: add task, verify after reload, sync and tasks on other devices. Avoid duplicate on double tap; button shows Adding.
10. Existing Notes FAB actions (swipe left Add note, Open Notes), Task Edit/Delete/gestures and Island reminder animations still work.
11. Desktop browser: existing task creation and keyboard shortcuts remain. Mobile web FAB can also launch Quick Add.
12. Biometric app lock still covers workspace; no Quick Add exposure before unlocking.
13. Android keyboards open/close without hiding Add task or shifting sheet offscreen; 150% text scaling remains scrollable.

## Install with VS Code PowerShell
\`\`\`powershell
cd "D:\Downloads\daymark-insforge-todo\daymark-onboarding"
git status --short
git fetch origin
git switch -c preview/v09-quick-add --track origin/feat/v09-smart-quick-add
npm ci
npm test
npm run build
npx cap sync android
npx cap open android
\`\`\`
If branch already exists: \`git switch preview/v09-quick-add\` then \`git pull --ff-only\`. Review/preserve dirty files before changing branches. In Android Studio select your Android device and click Run ▶.

## Non-goals
- Native home-screen AppWidgets, background quick add and widget cross-process caching (next milestone).
- No cloud NLP, LLM integration, external API, geolocation, recurrence schema, time-zone calendar sync, or "AI generated" suggestions.
