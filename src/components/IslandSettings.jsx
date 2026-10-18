import { useCallback, useEffect, useState } from 'react'
import { BellRing, Check, Clock3, Layers3, ShieldAlert, Sparkles, ExternalLink, Eye, Flower2, Waves, CircleDot, Wind, Play } from 'lucide-react'
import { motion } from 'motion/react'
import {
  islandStatus, isAndroidIslandSupported, previewIsland,
  requestIslandNotifications, requestIslandOverlay,
  scheduleIslandTest, setIslandEnabled, setIslandPlacement, setIslandMotionStyle,
  ISLAND_MOTION_PRESETS, ISLAND_PLACEMENT_DEFAULT,
} from '../lib/island.js'

/** Native, opt-in overlay settings; permissions only requested on direct tap. */
const MOTION_ICONS = {spring:Waves,bloom:Flower2,elastic:CircleDot,glide:Wind}
const MOTION_SPRINGS = {
  spring:{type:'spring',stiffness:330,damping:19,mass:.8},
  bloom:{type:'spring',stiffness:260,damping:12,mass:1.05},
  elastic:{type:'spring',stiffness:430,damping:10,mass:.75},
  glide:{type:'spring',stiffness:280,damping:35,mass:.8},
}

export default function IslandSettings({ notify, feel, reducedMotion=false }) {
  const [status, setStatus] = useState(null)
  const [busy, setBusy] = useState(false)
  const [placement, setPlacement] = useState({...ISLAND_PLACEMENT_DEFAULT})
  const [previewCycle, setPreviewCycle] = useState(0)
  const supported = isAndroidIslandSupported()

  const refresh = useCallback(async () => {
    try {
      const next = await islandStatus()
      setStatus(next)
      if (next?.supported) setPlacement({mode: next.placementMode ?? 'camera', x: next.placementX ?? 0, y: next.placementY ?? 0, width: next.placementWidth ?? 280})
    }
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
  const saved = status && placement.mode === status.placementMode && placement.x === status.placementX && placement.y === status.placementY && placement.width === status.placementWidth
  const updatePlacement = (field, value) => setPlacement(prev => ({...prev, [field]: value}))
  const motionStyle = status?.motionStyle ?? 'spring'
  const motionPreset = ISLAND_MOTION_PRESETS.find(option=>option.id===motionStyle) ?? ISLAND_MOTION_PRESETS[0]
  const canAnimate = !reducedMotion && !status?.motionReduced
  return <section className="island-settings" aria-labelledby="island-settings-title">
    <div className="island-settings-heading">
      <span className="island-settings-mark"><Layers3 size={19}/></span>
      <div><strong id="island-settings-title">Daymark Island <span className="island-beta">BETA</span></strong>
        <p>Floating, Material Expressive-inspired reminders for Android.</p></div>
    </div>
    <div className="island-setting-row">
      <div><strong>Floating Island</strong><p>{supported ? 'Optional floating reminder alongside the normal Android notification.' : 'Install the Android version to enable overlays.'}</p></div>
      <button type="button" role="switch" aria-label="Enable floating Daymark Island" aria-checked={enabled}
        className={'island-switch' + (enabled ? ' is-on' : '')}
        disabled={!supported || busy}
        onClick={() => void attempt(() => setIslandEnabled(!enabled),
          !enabled ? 'Island enabled. Grant Display over other apps to see it.' : 'Island off. Standard notifications are unaffected.')}>
        <span/>
      </button>
    </div>
    <div className="island-dual-delivery" role="status">
      <div className="island-dual-delivery-title"><BellRing size={18}/><strong>Normal notification + floating Island</strong></div>
      <p>{!supported
        ? 'Install Daymark on Android to test both notification types.'
        : !enabled
          ? 'Regular task notifications are already active. Enable Floating Island to add a second animated reminder.'
          : !status?.overlayGranted
            ? 'Regular notifications still work. Allow Display over other apps to enable floating Island reminders.'
            : 'Daymark posts the normal reminder and also tries to open the Island automatically. Some Android versions block background overlays; in that case expand the notification and tap Show Island to open it manually.'}</p>
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
    <div className="island-motion-studio" aria-label="Floating Island motion style">
      <div className="island-motion-heading">
        <div><span className="island-motion-kicker"><Sparkles size={14}/> ISLAND MOTION STUDIO</span>
          <strong>Choose how your Island moves.</strong>
          <p>Native, physics-inspired open, expand, collapse, and close animations. Your reminders stay the same.</p></div>
      </div>
      <div className="island-motion-demo">
        <span className="island-motion-halo" aria-hidden="true"/>
        <motion.div key={motionStyle + '-' + previewCycle}
          className={'island-motion-demo-pill island-motion-demo-'+motionStyle}
          initial={canAnimate?{opacity:0,scaleX:motionStyle==='bloom'?.68:motionStyle==='glide'?.93:.8,scaleY:motionStyle==='bloom'?.55:.75,y:-9}:{opacity:1,scaleX:1,scaleY:1,y:0}}
          animate={{opacity:1,scaleX:1,scaleY:1,y:0}}
          transition={canAnimate?MOTION_SPRINGS[motionStyle]:{duration:0}}>
          <span className="island-motion-demo-symbol"><Sparkles size={18}/></span>
          <span><small>DAYMARK · REMINDER</small><strong>You've got this.</strong></span>
          <Check size={17}/>
        </motion.div>
        <span className="island-motion-demo-caption">{motionPreset.label} · {motionPreset.description}</span>
      </div>
      <div className="island-motion-options" role="group" aria-label="Select Island motion animation">
        {ISLAND_MOTION_PRESETS.map(option=>{
          const Icon = MOTION_ICONS[option.id]
          return <button key={option.id} type="button" className={'island-motion-option'+(motionStyle===option.id?' is-selected':'')}
            aria-pressed={motionStyle===option.id} disabled={!supported||busy}
            onClick={()=>{setPreviewCycle(c=>c+1);void attempt(()=>setIslandMotionStyle(option.id),option.label+' selected. Next Island preview will use this motion.') }}>
            <span className="island-motion-option-icon"><Icon size={21}/></span>
            <span><strong>{option.label}</strong><small>{option.description}</small></span>
            {motionStyle===option.id&&<Check size={17} className="island-motion-option-check"/>}
          </button>
        })}
      </div>
      <button type="button" className="island-motion-replay" disabled={!supported||busy}
        onClick={()=>{feel('selection');setPreviewCycle(c=>c+1)}}>
        <Play size={15}/> Replay motion sample
      </button>
      <p className="island-motion-help">The illustration previews the style inside Daymark. Tap <strong>Preview Island</strong> below to see the real native animation over your Android screen. Android and Daymark reduced-motion settings take priority.</p>
    </div>
    <div className="island-calibration" aria-label="Island camera alignment">
      <div className="island-calibration-title">
        <strong>Camera alignment</strong>
        <p>Position the island near your phone's punch-hole camera. Android may limit coverage of the actual status bar.</p>
      </div>
      <div className="island-calibration-modes">
        <button type="button" aria-pressed={placement.mode === 'camera'} className={placement.mode === 'camera' ? 'is-selected' : ''}
          disabled={!supported || busy} onClick={() => updatePlacement('mode', 'camera')}>Camera-aligned</button>
        <button type="button" aria-pressed={placement.mode === 'safe'} className={placement.mode === 'safe' ? 'is-selected' : ''}
          disabled={!supported || busy} onClick={() => updatePlacement('mode', 'safe')}>Below status bar</button>
      </div>
      <div className="island-calibration-guide" aria-hidden="true">
        <div className="island-calibration-camera"/>
        <div className="island-calibration-pill" style={{
          transform: 'translate(' + (placement.x * .4) + 'px,' + (placement.y * .32 + (placement.mode === 'safe' ? 12 : 0)) + 'px)',
          width: Math.min(90, Math.max(52, placement.width * .25)) + '%'
        }}>DAYMARK ISLAND</div>
      </div>
      {[
        {key: 'x', label: 'Horizontal offset', min: -120, max: 120, suffix: 'dp'},
        {key: 'y', label: 'Vertical offset', min: -24, max: 140, suffix: 'dp'},
        {key: 'width', label: 'Pill width', min: 180, max: 340, suffix: 'dp'},
      ].map(control => <label className="island-calibration-control" key={control.key}>
        <span>{control.label}<strong>{placement[control.key]} {control.suffix}</strong></span>
        <input type="range" min={control.min} max={control.max} step="1" value={placement[control.key]}
          disabled={!supported || busy} onChange={event => updatePlacement(control.key, Number(event.target.value))}/>
      </label>)}
      <div className="island-calibration-actions">
        <button type="button" disabled={!supported || busy} onClick={() => setPlacement({...ISLAND_PLACEMENT_DEFAULT})}>Reset alignment</button>
        <button type="button" className="island-calibration-save" disabled={!supported || busy || saved}
          onClick={() => void attempt(() => setIslandPlacement(placement), 'Island alignment saved. Tap Preview Island to check it on your phone.')}>
          <Check size={15}/> Save alignment
        </button>
      </div>
    </div>
    <div className="island-preview-actions">
      <button type="button" className="island-preview-button" disabled={!supported || !enabled || !status?.overlayGranted || busy}
        onClick={() => void attempt(() => previewIsland('Review your Daymark tasks'), 'Floating Island preview opened for about 14 seconds.')}>
        <Eye size={16}/> Preview Island
      </button>
      <button type="button" className="island-test-button" disabled={!supported || busy}
        onClick={() => void attempt(() => scheduleIslandTest(1), 'Test reminder scheduled. The normal notification should appear. If the Island does not open automatically, expand the notification and tap Show Island.')}>
        <Clock3 size={16}/> Test reminder · ~1 min
      </button>
    </div>
    <div className="island-footnote"><ShieldAlert size={15}/>
      <p><strong>Experimental Android feature.</strong> Scheduled alerts are approximate, not exact alarms. A standard notification is the fallback when Android blocks floating windows. Lock-screen and Do Not Disturb policies still apply. Floating Island defaults to off.</p>
    </div>
    {supported && <div className="island-diagnostics" aria-label="Local reminder diagnostics">
      <div className="island-diagnostics-header">
        <strong>Reminder reliability</strong>
        <button type="button" disabled={busy} onClick={() => void refresh()}>Refresh status</button>
      </div>
      <p><strong>Last reminder:</strong> {status?.lastDelivery ?? 'Not available'}</p>
      <p><strong>Last Island status:</strong> {status?.lastOverlay ?? 'Not available'}</p>
      <p><strong>Last Island attempt time:</strong> {status?.lastOverlayAt ? new Date(status.lastOverlayAt).toLocaleString() : 'Not yet'}</p>
      <p><strong>Last delivery time:</strong> {status?.lastDeliveryAt ? new Date(status.lastDeliveryAt).toLocaleString() : 'Not yet'}</p>
      <p><strong>Reboot restore:</strong> {status?.lastRestoreAt ? status.lastRestoreCount + ' future reminder(s) re-registered' : 'Not tested yet'}</p>
      <p className="island-diagnostics-note">A service-start request does not guarantee the overlay appeared. A "displayed successfully" status confirms it was added to the screen. This diagnostic is stored locally. Android may restrict background overlays and Do Not Disturb may hide heads-up alerts.</p>
    </div>}
    <div className="island-meta"><Sparkles size={13}/> {supported ? (status?.scheduledCount ?? '—') + ' reminder(s) waiting · Local to this device' : 'Preview controls appear in the Android app only'}</div>
  </section>
}
