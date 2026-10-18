# Daymark — Cinematic Motion Graphics v0.2

This is an **isolated Remotion production workspace**. It does not import, execute, or modify Daymark's app, InsForge backend, or environment variables.

## Creative direction

After Effects–inspired compositing: deep violet ambient glow, layered orbital lines, staggered typography, motion blur-style entrance transitions, a perspective-transformed Daymark UI recreation, sequential task completion, animated progress, and branded end card. The UI is a stylized recreation grounded in the checked-in Daymark source, **not a screen recording**.

## Compositions

| ID | Length | Resolution | Purpose |
|---|---|---|---|
| DaymarkLaunch | 24 s | 1920×1080 | Promotional launch film |
| DaymarkHeroLoop | 12 s | 1920×1080 | Muted website hero |
| DaymarkVertical | 20 s | 1080×1920 | Mobile/social adaptation |

## Local rendering

Requires Node.js 20+, npm, FFmpeg and Chrome/Chromium available to Remotion.

```bash
cd promo/remotion
npm install
npm run studio
npm run render
npm run render:loop
npm run render:mobile
npm run render:poster
```

Files are written to `out/`. The `out/` directory is not tracked.

## Quality gate

**Source has been committed; actual renders have not yet been validated.** Before release: run all compositions, inspect frame samples at scene boundaries and final frames, check for clipping and legibility (especially the vertical cut), check loop boundary and refine if necessary, validate fonts, compress with FFmpeg, and test autoplay/muted/playsinline on real mobile browsers. Do not claim the 12-second version is perfectly seamless until the loop boundary has been checked.

## ImageKit handoff

Upload MP4 and poster to ImageKit after QA. Use the returned asset URLs; do not put private keys in frontend code.

```html
<video autoplay muted loop playsinline preload="metadata" poster="IMAGEKIT_POSTER_URL" aria-label="Daymark productivity preview">
  <source src="IMAGEKIT_HERO_VIDEO_URL" type="video/mp4" />
</video>
```

Use a poster image or still UI for `prefers-reduced-motion: reduce`. Keep original video exports available as fallback, and test CDN transformations before deploying. Website integration is deliberately deferred until renders are approved.
