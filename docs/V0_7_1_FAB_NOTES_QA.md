# Daymark v0.7.1 — FAB Menu, Haptics & Notes Visibility

Status: **draft**, stacked on v0.7, not merged or deployed. Physical Pixel 9 QA still required.

## Why Notes is missing in the user's screenshot

The screenshot shows the **older v0.6.1 build**: the fifth mobile tab reads **Completed**, and the floating **+** directly opens New Task. The **Notes** tab and three-option FAB arrived in the `feat/v0.7-quick-notes-fab` branch but had not been installed on the physical phone.

v0.7.1 includes v0.7; **you only need to install this latest branch**, not every version separately.

## Navigation / UX

- Mobile bottom bar: **Home · Today · Upcoming · Calendar · Notes**. Completed tasks remain available via the desktop/tablet side navigation (and may be exposed from Home in a later update).
- Standalone **Notes** workspace (not task descriptions): quick capture, instant local autosave, search, pin, edit, delete with confirmation.
- Floating **+** now toggles three **separate, expressive pill** actions exactly in this visible top-to-bottom order:
  1. **Add a task**
  2. **Add a note**
  3. **Open Notes**
- Tap FAB to expand; tap again to collapse. Swipe **left ON FAB** to quick capture a note. Swipe **up ON FAB** to expand.
- Material-inspired spring motion: faster stiffness `520`, damping `33`, mass `0.78`; individual pills use stiffness `490`, damping `32`, stagger `35ms`. Plus rotates `45°` to a close icon. Closing springs back and fades; reduced motion is respected.
- Haptics: open/close/expand = native selection tick. Choosing an action is handled by the existing Daymark callback, giving the appropriate native action/selection haptic without a duplicate.
- Uses the existing `DaymarkHaptics` Android bridge; Honors Off/Subtle/Balanced/Strong and Android's Touch feedback settings. No `navigator.vibrate()`, no new permissions.
- Maintains v0.4 task swipe gestures. FAB gestures are scoped to the button itself (not the phone edge).

## Pixel 9 QA

1. Open **Personalize → Touch feedback**, choose Balanced.
2. Tap FAB, confirm three pill options, spring animation, selection tick; tap again, confirm smooth return and tick.
3. Tap **Add a task** → opens task form. Tap FAB → **Add a note** → opens quick editor and focuses text. Tap FAB → **Open Notes** → navigates to the independent Notes tab.
4. Swipe left on FAB: opens Quick Note directly without also toggling the menu; swipe up: expands menu.
5. Type in note title/body; leave editor, reopen Notes, edit and pin, search, delete. Nothing should depend on cloud connectivity. Test cancel deletion.
6. Set haptics Off, repeat: no Daymark haptics. Test Subtle and Strong.
7. Test dark mode, palette choices, reduced motion, system back navigation and Android keyboard.
8. Verify the screenshot now shows **Notes** as the fifth tab (not Completed). If not, Android Studio has run the wrong worktree/version.

**Caution:** Notes are saved on this device using local app storage, **not InsForge cloud sync**. Clearing app data/uninstalling can remove them. Do not store irreplaceable notes without an independent backup.

## Fetch/install

In **VS Code PowerShell terminal**:

```powershell
cd "D:\Downloads\daymark-insforge-todo\daymark-expressive"
git status --short
# If generated Android files are modified/untracked, preserve them before switching:
git stash push -u -m "Local Android changes before v0.7.1"
git fetch origin
git switch -c preview/fab-notes --track origin/feat/v0.7.1-fab-spring-haptics
npm ci
npm test
npm run build
npx cap sync android
npx cap open android
```

If the branch exists already: `git switch preview/fab-notes` then `git pull --ff-only`. Only run the stash command if `git status` shows changes to protect.

**Android Studio**: explicitly open `D:\Downloads\daymark-insforge-todo\daymark-expressive\android` (not the similarly named older `daymark-insforge\android` directory). Select Pixel 9 and Run ▶. Confirm the deployed package is `com.piyush.daymark`.

Nothing is merged into `main`, deployed to InsForge, or changed in the production database.
