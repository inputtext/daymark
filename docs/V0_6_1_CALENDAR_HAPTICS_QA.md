# Daymark v0.6.1 — Calendar haptics and picker polish (Pixel 9 QA)

Status: **draft and device testing required**. Stacked on v0.6; no production deployment or database migration has been applied.

## Changes
- Connect the existing Android-native \`DaymarkHaptics\` bridge to the task editor's Expressive Date/Time pickers. No new vibration API or dangerous permissions.
- **Selection ticks** on newly selected dates, month navigation, hour/minute dial detents, AM/PM transitions and picker view switches; **action feedback** when entering or confirming a changed time/date.
- Native Android rate limits repeated effects (55ms) and honors Off/Subtle/Balanced/Strong and Android's Touch feedback setting. No haptics in the browser and no intentional feedback when selecting an already selected value.
- Drag a finger around the time clock to change hour/minute; automatically advances to minute selection after finishing an hour gesture. Clock buttons still support keyboard activation.
- Date/time picker focus returns to launch control on Cancel/OK/Escape. A picker Escape no longer closes the entire task editor. Tab stays inside the open dialog.
- Animated selected-date shape, clearer today outline, larger picker touch targets, responsive Pixel 9 spacing and reduced-motion handling.
- Daily Timeline offers the full date picker as a **Move date** control instead of just four fixed offsets. Mouse drag/drop and mobile touch behavior remain experimental; the picker is the accessible fallback.
- Time field stays disabled until a due date exists; clearing date also clears the time so no unsaved time is silently discarded.
- No changes to Island, reminder timing, InsForge policies or Android permissions. Cloud task time still needs the existing additive SQL migration described in \`docs/V0_6_CALENDAR_QA.md\`.

## Physical Pixel 9 checklist
1. Build from feature branch; in **Personalize → Touch feedback**, set Balanced.
2. Create task → Due date → change month → pick different date → OK. Expect crisp **selection ticks**, followed by a single confirmation click; repeating the same date should not repeatedly buzz.
3. Set time → drag from 9 to 10 o'clock and release. Hour dial advances to minute dial. Drag around minutes; each new 5-minute detent provides a subtle selection tick. AM → PM provides one tick.
4. Switch to keyboard mode. Change hour and minute; ensure valid values, AM/PM, Clear/Cancel/OK. Set 12:00 AM, 12:00 PM, 11:59 PM.
5. Press Escape while either picker is open. Only the picker should close; the underlying task editor must remain open. Confirm focus returns to Due date / Time.
6. Change Daymark haptics to Off. Repeat all selection actions; **nothing should vibrate**. Verify Subtle and Strong, then disable Android system Touch feedback and repeat.
7. In Calendar → Day/Week/Month, select dates and verify animated highlight and selected-day timeline. Try reduced motion and TalkBack.
8. Use a timeline task → Move date → choose a date several months away. Confirm it moves and persists after app restart in both demo and InsForge cloud mode.
9. Test dark/light mode and Iris/Lagoon/Citrus/Rose palette, portrait Pixel 9 keyboard overlay, one-hand reach, and small 320px browser emulation.
10. Regression: native task swipe/long-press, Daymark Island, reminder notification fallback, theme settings and existing task updates.

## Installing
**VS Code PowerShell terminal** in \`D:\Downloads\daymark-insforge-todo\daymark-expressive\`:
\`\`\`powershell
git status --short
# If generated Android files are modified, save them first:
git stash push -u -m "Android local changes before Calendar haptics"
git fetch origin
git switch -c preview/calendar-haptics --track origin/feat/v0.6.1-calendar-haptics-polish
npm ci
npm test
npm run build
npx cap sync android
npx cap open android
\`\`\`
If preview/calendar-haptics already exists, switch to it and \`git pull --ff-only\`. Do not stash a clean project unnecessarily.

**Android Studio**: select physical Pixel 9 → Run ▶. GitHub Actions will verify React tests, Vite build and Android debug APK build; real haptic quality cannot be verified by CI.
