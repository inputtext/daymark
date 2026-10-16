# Daymark Expressive Design System

Daymark's Expressive visual foundation is an original, Material 3 Expressive-inspired CSS design system. It does not bundle Google's proprietary components, branding or fonts.

## Included
- Rounded asymmetric containers, tonal surfaces, layered elevations, pill-shaped controls, and adaptive mobile bottom navigation
- Four color stories: Iris, Lagoon, Citrus, Rose; persisted locally under `daymark:palette`
- Built-in light/dark modes, motion preference under `daymark:less-motion`, and respect for `prefers-reduced-motion`
- A palette and motion settings sheet via the sparkle button in the top bar; descriptive and accessible task actions remain intact
- Mobile safe-area spacing, enlarged touch affordances, modal bottom sheet, and expressive micro-interactions

## Limitations and follow-up
- Colors are user-selected palettes, **not yet** Android wallpaper dynamic colors. The WebView requires a native bridge to query Android's Material You palette.
- `src/expressive.css` is imported **after** `src/styles.css` so original styles remain available and easy to compare.
- Haptics are a separate follow-up PR once the tested Capacitor Android source and corresponding lockfile are committed; the UI does not claim native haptics today.
- No InsForge schema/auth changes. No cloud AI integration.
- Test both logged-in and demo modes, dark/light palettes, 320px–desktop widths, screen reader navigation and `prefers-reduced-motion`.
