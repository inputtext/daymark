# Daymark Android APK distribution — signed-release preparation

> **Status:** build tooling prepared; no APK has been signed, uploaded or released; no website has been published; no PR merged. The website design remains unchanged. Publishing requires separate, explicit approval.

## Why a signed release APK?

Android packages are updated only when the `applicationId` and signing certificate remain compatible and the new `versionCode` increases. The debug APK from Android Studio uses a *debug key*, which is unsuitable for friends/public distribution. Daymark's permanent package ID remains `com.piyush.daymark`.

| Output | Purpose | Share with friends? |
| --- | --- | --- |
| `android/app/build/outputs/apk/debug/app-debug.apk` | Developer debug builds | Trusted internal testing only |
| `release-artifacts/daymark-vVERSION-android.apk` | Locally signed and verified release APK | Yes, **after explicit owner approval** |
| `release-artifacts/daymark-vVERSION-SHA256.txt` | SHA-256 integrity checksum for that APK | Publish alongside the APK |

The keystore is YOUR long-term app identity. Back it up securely (password manager or encrypted offline backup). Losing the key means existing installs generally cannot receive normal in-place updates signed with a different key.

## 1. Create your private keystore ONCE

Open PowerShell on your Windows laptop and ensure a JDK's `keytool` is available:

```powershell
where.exe keytool
New-Item -ItemType Directory -Force "$env:USERPROFILE\.daymark-keys"
keytool -genkeypair -v -storetype PKCS12 -keystore "$env:USERPROFILE\.daymark-keys\daymark-release.jks" -alias daymark-release -keyalg RSA -keysize 3072 -validity 9125
```

`keytool` will prompt for a strong password and certificate owner details; don't type passwords into command arguments or share them in chat. Use a keystore **outside the repository**. Keep an encrypted backup of both the file and its passwords. For PKCS12, key and store passwords are commonly the same.

**Never commit:** `.jks`, `.keystore`, `keystore.properties`, passwords, Google service/admin secrets, or the `release-artifacts/` folder. They are ignored by the project's `.gitignore` as defense in depth.

## 2. Build your candidate from a reviewed Git branch

Run from the project root on the feature branch you are actually approving for distribution. This example is **illustrative only**; choose the correct release version and integer build code:

```powershell
git status
git branch --show-current
.\scripts\build-signed-apk.ps1 -VersionName 0.9.0-beta.1 -VersionCode 1 -KeystorePath "$env:USERPROFILE\.daymark-keys\daymark-release.jks" -KeyAlias daymark-release
```

The script:
1. Runs `npm ci`, `npm test`, `npm run build`, and `npx cap sync android` *before* asking for any signing secrets.
2. Prompts for keystore/key passwords using secure terminal input.
3. Runs Gradle `:app:assembleRelease` using temporary environment variables; refuses unsigned release builds.
4. Validates the signature with Android SDK `apksigner verify --verbose --print-certs`.
5. Places a signed, versioned APK and its SHA-256 checksum in the ignored `release-artifacts/` folder; prints artifact paths.
6. Clears signing-related environment variables when finished.

No upload, email, GitHub API or network publication is performed by this script. npm packages and cloud task functionality still require the normal network access.

If PowerShell refuses to run the script due to execution policy, use a process-scoped execution policy appropriate for your machine and inspect the script first; do not disable security globally.

## 3. Verify the exact APK on a phone

- Test on a real Android phone across major workflows: onboarding, sign-in/demo, Quick Add, tasks, Notes, calendar, notifications, and all three home-screen widgets.
- Ensure cloud credentials configured in the frontend are only the **public InsForge anon** key and host URL. Never embed the service/admin key. Apply relevant backend migrations as separately approved.
- Test both fresh installation and updating an earlier **release-signed** APK. Every update must increment `versionCode` and reuse the **same keystore**. The signing key should not be changed.
- **Warning about existing debug installations:** a release signed with your new production certificate cannot generally be installed *over* an existing debug-key APK with the same package name. Back up/sync important Notes and tasks **before** uninstalling the debug app, as uninstalling can erase local-only/demo information.
- Use `apksigner verify --print-certs` and compare the certificate digest between consecutive release builds.
- Validate the SHA-256 against the packaged file after transfer, especially if shared via messages or cloud storage.
- Android may request an `Install unknown apps` permission. Never instruct users to disable Play Protect or install APKs from unknown impersonator sources.

## 4. GitHub Releases — owner approval required

When the owner explicitly authorizes publishing, use the **official** `https://github.com/inputtext/daymark/releases` page to draft a release matching the app version (for example `v0.9.0-beta.1`). Attach both:
- `daymark-v0.9.0-beta.1-android.apk`
- `daymark-v0.9.0-beta.1-SHA256.txt`

Add meaningful release notes, supported Android versions, known limitations, and the signing certificate fingerprint if desirable. A release marked **prerelease** is displayed as a clearly labeled **beta** download when no stable signed APK has been published. If stable releases exist, the landing page gives them preference, so a beta doesn't silently replace the stable recommendation. Drafts and files with `debug`, `unsigned` or `unaligned` in their names aren't served as the download CTA.

Review and explicitly approve **both** actions separately: (1) publishing the APK release, and (2) publishing the website/static hosting. Neither happens automatically and neither is authorized by approval of the visual design.

## 5. Landing page

The approved marketing page lives in `download/` and is fully static. After explicit owner approval it can be hosted separately (for example GitHub Pages, Vercel static hosting or Netlify). It reads the public GitHub Releases API and doesn't need an APK server, token or database.

- Before the first eligible published release, it shows **No APK published yet**.
- A public beta is identified as a **test build**, not claimed to be stable.
- Published version/tag, date, size and release notes are read from GitHub.
- The APK button points to the exact asset URL on the official repository.
- The website's mock phone is an illustration, not an actual app screenshot.
- Hosting, DNS, live domain and release publishing remain **unconfigured**.

## 6. Non-goals and cautions

No Google Play submission, no Play Billing, no signing-key storage on GitHub, no automatic release, no force-installation and no secret-backed API endpoints. GitHub public API rate limits can temporarily hide release metadata; users can still open the official Releases page. Android OS can restrict sideloading and notifications; do not promise bypasses.

**Do not replace the working production Android installation until your signed release has been checked on a separate device or you have backed up its local data.**
