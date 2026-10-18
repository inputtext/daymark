/* Public GitHub Releases only. No credentials, build secrets or analytics. */
(() => {
  'use strict'
  const REPO = 'inputtext/daymark'
  const RELEASES = 'https://github.com/' + REPO + '/releases'
  const API = 'https://api.github.com/repos/' + REPO + '/releases?per_page=20'
  const $ = id => document.getElementById(id)
  const status = $('release-status')
  const download = $('apk-link')
  const fmtDate = iso => {
    const date = new Date(iso)
    return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('en', {year:'numeric', month:'short', day:'numeric'}).format(date)
  }
  const fmtBytes = n => typeof n === 'number' && n > 0 ? (n / 1024 / 1024).toFixed(1) + ' MB' : '—'
  const safeReleaseUrl = url => {
    try {
      const parsed = new URL(url)
      return parsed.protocol === 'https:' && parsed.hostname === 'github.com' &&
        parsed.pathname.startsWith('/' + REPO + '/releases/') ? parsed.href : null
    } catch { return null }
  }
  const text = (el, value) => { if (el) el.textContent = value }
  const showTextNotes = body => {
    const target = $('release-notes-content')
    target.replaceChildren()
    const content = String(body || '').trim().slice(0, 6000)
    if (!content) { const p = document.createElement('p'); p.textContent = 'No release notes provided.'; target.append(p); return }
    // Render plain text instead of untrusted HTML or Markdown; keep GitHub notes safe.
    for (const chunk of content.split(/\n\s*\n/).slice(0, 16)) {
      const p = document.createElement('p')
      p.textContent = chunk.trim().replace(/^#{1,6}\s*/gm, '').replace(/^[-*]\s*/gm, '• ')
      target.append(p)
    }
  }
  const setUnavailable = message => {
    text(status, message)
    text($('release-version'), 'Not published')
    download.href = RELEASES
    download.classList.add('is-disabled')
    download.setAttribute('aria-disabled', 'true')
    download.firstChild.textContent = 'No APK published yet '
  }
  async function loadRelease() {
    try {
      const response = await fetch(API, {headers:{Accept:'application/vnd.github+json'}})
      if (!response.ok) throw new Error('Release API unavailable')
      const releases = await response.json()
      if (!Array.isArray(releases)) throw new Error('Unexpected release data')
      // Never promote a draft, prerelease, or tag without an actual APK asset.
      const candidates = releases.filter(r => !r.draft && !r.prerelease && r.published_at)
      const release = candidates.find(r => Array.isArray(r.assets) && r.assets.some(a =>
        /\.apk$/i.test(a.name || '') && safeReleaseUrl(a.browser_download_url)
      ))
      if (!release) { setUnavailable('No public Android APK release yet'); return }
      const apk = release.assets.find(a => /\.apk$/i.test(a.name || '') && safeReleaseUrl(a.browser_download_url))
      text(status, 'Official GitHub release available')
      text($('release-version'), String(release.tag_name || release.name || 'Latest'))
      text($('release-date'), fmtDate(release.published_at))
      text($('release-size'), fmtBytes(apk.size))
      download.href = safeReleaseUrl(apk.browser_download_url)
      download.classList.remove('is-disabled')
      download.removeAttribute('aria-disabled')
      download.firstChild.textContent = 'Download APK '
      text($('notes-version'), 'Release ' + String(release.tag_name || release.name || 'Latest'))
      $('notes-link').href = safeReleaseUrl(release.html_url) || RELEASES
      showTextNotes(release.body)
    } catch {
      setUnavailable('Unable to check releases right now')
      text($('release-notes-content'), '')
      const p = document.createElement('p')
      p.textContent = 'Release information could not be loaded. Please visit the official GitHub Releases page.'
      $('release-notes-content').append(p)
    }
  }
  // The disabled button must not act like an available download.
  download.addEventListener('click', e => { if (download.classList.contains('is-disabled')) e.preventDefault() })
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('in-view'); observer.unobserve(entry.target) } })
    }, {threshold: 0.09})
    document.querySelectorAll('.feature-card, .step-number, .release-card').forEach(el => observer.observe(el))
  }
  loadRelease()
})()
