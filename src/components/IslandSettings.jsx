import { useCallback, useEffect, useState } from 'react'
import { BellRing, Check, Clock3, Layers3, ShieldAlert, Sparkles, ExternalLink, Eye } from 'lucide-react'
import {
  islandStatus, isAndroidIslandSupported, previewIsland,
  requestIslandNotifications, requestIslandOverlay,
  scheduleIslandTest, setIslandEnabled,
} from '../lib/island.js'

/** Native, opt-in overlay settings; permissions only requested on direct tap. */
export default function IslandSettings({ notify, feel }) {
  const [status, setStatus] = useState(null)
  const [busy, setBusy] = useState(false)
  const supported = isAndroidIslandSupported()

  const refresh = useCallback(async () => {
    try { setStatus(await islandStatus()) }
    catch { setStatus(null) }
  }, [])

  useEffect(() => {
    void refresh()
    const onFocus = () => void refresh()
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh()
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [refresh])

  const attempt = async (operation, success) => {
    if (!supported || busy) return
    setBusy(true)
    try {
      const result = await operation()
      if (result?.supported !== undefined) setStatus(result)
      else await refresh()
      feel('success')
      notify(success)
    } catch (error) {
      feel('error')
      notify(error?.message || 'Could not complete the Island action')
    } finally { setBusy(false) }
  }

  const enabled = Boolean(status?.enabled)
  return <section className="island-settings" aria-labelledby="island-settings-title">
    <div className="island-settings-heading">
      <span className="island-settings-mark"><Layers3 size={19}/></span>
      <div><strong id="island-settings-title">Daymark Island <span className="island-beta">BETA</span></strong>
        <p>Floating, Material Expressive-inspired reminders for Android.</p></div>
    </div>
    <div className="island-setting-row">
      <div><strong>Floating Island</strong><p>{supported ? 'Only appears for previews and due reminders, then disappears.' : 'Install the Android version to enable overlays.'}</p></div>
      <button type="button" role="switch" aria-label="Enable floating Daymark Island" aria-checked={enabled}
        className={'island-switch' + (enabled ? ' is-on' : '')}
        disabled={!supported || busy}
        onClick={() => void attempt(() => setIslandEnabled(!enabled),
          !enabled ? 'Island enabled. Grant Display over other apps to see it.' : 'Island off. Standard notifications are unaffected.')}>
        <span/>
      </button>
    </div>
    <div className="island-permission-grid">
      <div className="island-permission">
        <div className="island-permission-title"><Layers3 size={16}/><strong>Display over apps</strong></div>
        <span className={status?.overlayGranted ? 'island-ok' : 'island-needed'}>
          {status?.overlayGranted ? <><Check size={13}/> Allowed</> : 'Not allowed'}
        </span>
        <button type="button" disabled={!supported || busy || status?.overlayGranted}
          onClick={() => void attempt(requestIslandOverlay,
            'In Android Settings, enable Display over other apps for Daymark, then return.')}>
          {status?.overlayGranted ? 'Permission granted' : <>Open permission settings <ExternalLink size={13}/></>}
        </button>
      </div>
      <div className="island-permission">
        <div className="island-permission-title"><BellRing size={16}/><strong>Notifications</strong></div>
        <span className={status?.notificationsGranted ? 'island-ok' : 'island-needed'}>
          {status?.notificationsGranted ? <><Check size={13}/> Allowed</> : 'Not allowed'}
        </span>
        <button type="button" disabled={!supported || busy || status?.notificationsGranted}
          onClick={() => void attempt(requestIslandNotifications,
            'Notification permission checked. Due reminders can use Android notifications.')}>
          {status?.notificationsGranted ? 'Permission granted' : 'Request permission'}
        </button>
      </div>
    </div>
    <div className="island-preview-actions">
      <button type="button" className="island-preview-button" disabled={!supported || !enabled || !status?.overlayGranted || busy}
        onClick={() => void attempt(() => previewIsland('Review your Daymark tasks'), 'Floating Island preview opened for about 14 seconds.')}>
        <Eye size={16}/> Preview Island
      </button>
      <button type="button" className="island-test-button" disabled={!supported || busy}
        onClick={() => void attempt(() => scheduleIslandTest(1), 'Test scheduled for approximately 1 minute from now. Android may deliver it later.')}>
        <Clock3 size={16}/> Test reminder · ~1 min
      </button>
    </div>
    <div className="island-footnote"><ShieldAlert size={15}/>
      <p><strong>Experimental Android feature.</strong> Scheduled alerts are approximate, not exact alarms. A standard notification is the fallback when Android blocks floating windows. Lock-screen and Do Not Disturb policies still apply. Floating Island defaults to off.</p>
    </div>
    <div className="island-meta"><Sparkles size={13}/> {supported ? (status?.scheduledCount ?? '—') + ' reminder(s) waiting · Local to this device' : 'Preview controls appear in the Android app only'}</div>
  </section>
}
