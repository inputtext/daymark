# Daymark — standalone Android download landing page

## Preview (not published)
This directory is a **standalone static site**, independent of the React/Capacitor app. Nothing in this branch changes the existing app route, build, Android package, authentication or task data. The site is intentionally **not** connected to a deployment workflow until the owner approves publishing.

Run locally:

```powershell
cd download
python -m http.server 4173
```

Open http://localhost:4173. The live release data is fetched from the public GitHub REST API; local development works without an API key. Alternatively use VS Code Live Server.

## Features
- Responsive, custom-designed premium marketing page with original illustrative phone mockup (not a screenshot), animated reveal, feature cards and Android installation instructions.
- Accessible skip link, semantic sections, keyboard focus styles, reduced-motion support and responsive 320px+ layout.
- Reads **public non-prerelease GitHub Releases** from `https://api.github.com/repos/inputtext/daymark/releases?per_page=20` and chooses the first release containing a real `.apk` asset.
- Shows the tag/version, published date, APK size, and plain-text release notes from that release.
- Download link uses the **actual APK asset URL** from GitHub Releases, never a fabricated version or APK.
- Shows an explicit **No APK published yet** disabled state while the repository has no eligible public release.
- Safe fallback when GitHub API is rate-limited/offline; users can open the official Releases page.
- Never renders release notes as HTML, never embeds API credentials, and never auto-installs an APK.

## QA
1. Desktop, tablet, 320px/360px/390px Android phone: no horizontal overflow or clipped buttons.
2. Keyboard tab navigation, skip link, light backgrounds, and reduced-motion accessibility.
3. With no published releases: disabled APK button and accurate no-release status.
4. If the API is unreachable or rate limited: fallback message and official Releases link.
5. With an official published non-prerelease release containing a signed APK: correct asset URL, version, date, size, and release notes.
6. If a release contains no APK: do not show a fake download. A draft or prerelease is not advertised as stable.
7. Check links, responsive footer, external-link behavior and installation instructions.
8. Verify `npm test`, `npm run build` and Android Gradle CI on the branch; the standalone site must not affect the app.

## Publishing (requires explicit approval)
No GitHub Pages, Vercel, Netlify, DNS or production changes have been made.

After approval, publish the `download/` directory through a static host such as Vercel or Netlify, or copy its contents to the GitHub Pages publishing root. **GitHub Pages cannot directly serve an arbitrary `/download` folder as a site root without an appropriate build/deployment workflow**. Publishing a separate domain/subdomain is optional.

Before publicly sharing an APK, build a signed **release** APK (not a debug APK), protect the keystore, verify installation/update signatures, and upload the APK asset and release notes to a GitHub Release. The landing page will then automatically detect it without a new website deployment. Do not upload signing credentials to GitHub.

## Known limitations
- Public GitHub API has unauthenticated rate limits and the page does not cache data server-side.
- Release notes are displayed as **safe plain text**, not full GitHub Markdown formatting.
- Only the latest 20 releases are scanned; a release must be public, non-draft, non-prerelease and contain an APK.
- The site does not provide automatic Android updates or bypass sideloading warnings.
- Phone UI is an original illustrative concept, not a claim that every screen looks identical to the app.
- Widgets and some Android floating overlay behavior still require real-device testing.
