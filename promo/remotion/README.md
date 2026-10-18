# Daymark promotional motion graphics

Independent Remotion video project. It does not import, change, or run the Daymark app/backend.

## Start

From this folder with Node.js 20+:

```bash
npm install
npm run studio
npm run render
npm run render:poster
```

Output: `out/daymark-hero.mp4` (10 seconds, 1920×1080, 30fps, H.264) and poster PNG.

## Creative direction

Based on the Daymark repository's checked-in React UI and CSS: checkmark wordmark, violet #7467f2, dark navy sidebar, Today navigation, progress banner, and task rows. The animation is a stylized UI recreation, not a literal recording. No claim is made about unreleased features.

## ImageKit website integration

Upload the rendered MP4 and poster to ImageKit, then use the returned URLs:

```html
<video autoplay muted loop playsinline preload="metadata" poster="IMAGEKIT_POSTER_URL" aria-label="Daymark productivity dashboard preview">
  <source src="IMAGEKIT_VIDEO_URL" type="video/mp4" />
</video>
```

Keep the video muted for autoplay and add a reduced-motion fallback in the consuming website. Do not embed ImageKit private keys in client code.

## Next production passes

1. Validate the animation against current deployed UI/screenshots.
2. Refine timings, typography, transitions and add optional sound to a separate non-autoplay cut.
3. Render mobile 9:16 composition and a shorter seamless looping hero.
4. Run visual QA and measure compressed asset size before publishing.
