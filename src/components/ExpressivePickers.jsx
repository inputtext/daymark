import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { CalendarDays, ChevronLeft, ChevronRight, Check, Clock3, Keyboard, X } from 'lucide-react'
import { clockDialValue, localISO, monthDates, monthStart, parseLocalDay, shiftMonth, timeLabel } from '../lib/calendar.js'
import { SPRING } from '../lib/gestures.js'

const WEEK = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const monthName = date => parseLocalDay(date).toLocaleDateString('en-US', {month:'long', year:'numeric'})
const prettyDate = date => parseLocalDay(date)?.toLocaleDateString('en-US', {weekday:'short', month:'short', day:'numeric'})
const clamp = (value, min, max) => Math.max(min, Math.min(max, value))

// An accessible modal boundary; Escape closes the picker, not the underlying
// task editor. Keyboard focus returns to the launch button after dismissal.
function usePickerKeyboard(open, dialogRef, triggerRef, onClose) {
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  useEffect(() => {
    if (!open) return
    dialogRef.current?.focus()
    const handleKey = event => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        closeRef.current()
      }
      if (event.key !== 'Tab') return
      const nodes = Array.from(dialogRef.current?.querySelectorAll(
        'button:not(:disabled),input:not(:disabled),select:not(:disabled)'
      ) || [])
      if (!nodes.length) return
      const first = nodes[0], last = nodes[nodes.length-1]
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
        event.preventDefault(); last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus()
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, dialogRef])
}

export function ExpressiveDatePicker({value, onChange, feel, lessMotion=false, label='Choose date', ariaLabel}) {
  const [open, setOpen] = useState(false)
  const [month, setMonth] = useState(monthStart(value || localISO(new Date())))
  const [inputMode, setInputMode] = useState(false)
  const [draft, setDraft] = useState(value || '')
  const triggerRef = useRef(null)
  const dialogRef = useRef(null)
  const close = () => {setOpen(false); triggerRef.current?.focus()}
  usePickerKeyboard(open, dialogRef, triggerRef, close)
  useEffect(() => {
    if (open) {setDraft(value || ''); setMonth(monthStart(value || localISO(new Date())))}
  }, [open, value])
  const cells = useMemo(() => monthDates(month), [month])
  const previewDate = day => {
    if (day === draft) return
    setDraft(day)
    feel?.('selection')
  }
  const commit = day => {
    if (day && !parseLocalDay(day)) return
    if (day !== (value || '')) {onChange(day); feel?.('action')}
    close()
  }
  const navigateMonth = delta => {setMonth(m => shiftMonth(m, delta)); feel?.('selection')}
  return <>
    <button ref={triggerRef} className="calendar-picker-trigger" type="button"
      aria-haspopup="dialog" aria-expanded={open} aria-label={ariaLabel || undefined}
      onClick={() => {setInputMode(false); setOpen(true); feel?.('action')}}>
      <CalendarDays size={18}/>
      <span>{value && parseLocalDay(value) ? parseLocalDay(value).toLocaleDateString('en-US', {month:'short',day:'numeric',year:'numeric'}) : label}</span>
      <ChevronRight size={16}/>
    </button>
    {createPortal(<AnimatePresence>
      {open && <motion.div className="calendar-picker-shade" initial={{opacity:0}} animate={{opacity:1}}
        exit={{opacity:0}} transition={{duration:lessMotion?0:.16}}
        onMouseDown={event => {if (event.target === event.currentTarget) close()}}>
        <motion.section ref={dialogRef} tabIndex={-1} className="calendar-picker-dialog"
          role="dialog" aria-modal="true" aria-label="Choose task due date"
          initial={lessMotion?false:{opacity:0, y:24, scale:.965}}
          animate={{opacity:1, y:0, scale:1}}
          exit={lessMotion?{opacity:0}:{opacity:0, y:10, scale:.975}}
          transition={lessMotion?{duration:0}:SPRING}>
          <div className="calendar-picker-top">
            <span>SELECT DATE</span>
            <button type="button" aria-label="Close date picker" onClick={close}><X size={20}/></button>
          </div>
          <div className="calendar-picker-selected">
            <strong aria-live="polite">{draft && parseLocalDay(draft) ? prettyDate(draft) : 'No date selected'}</strong>
            <button type="button" aria-label={inputMode?'Show calendar grid':'Type a date'}
              onClick={() => {setInputMode(mode => !mode); feel?.('selection')}}>
              {inputMode?<CalendarDays size={20}/>:<Keyboard size={20}/>}
            </button>
          </div>
          {inputMode ?
            <label className="calendar-picker-input">Enter date
              <input type="date" value={draft} onChange={event => {
                const next = event.target.value
                if (next === draft) return
                setDraft(next)
                if (parseLocalDay(next)) feel?.('selection')
              }}/>
            </label>
          : <>
            <div className="calendar-picker-month">
              <strong>{monthName(month)}</strong>
              <div>
                <button type="button" aria-label="Previous month" onClick={() => navigateMonth(-1)}><ChevronLeft size={20}/></button>
                <button type="button" aria-label="Next month" onClick={() => navigateMonth(1)}><ChevronRight size={20}/></button>
              </div>
            </div>
            <div className="calendar-picker-grid" role="group" aria-label={monthName(month)}>
              {WEEK.map((day,index) => <span key={index} className="calendar-picker-weekday">{day}</span>)}
              {cells.map(day => <motion.button type="button" key={day}
                className={'calendar-picker-day' + (day === draft ? ' is-picked' : '') +
                  (day.slice(0,7) !== month.slice(0,7) ? ' is-outside' : '') +
                  (day === localISO(new Date()) ? ' is-today' : '')}
                aria-label={parseLocalDay(day).toDateString()} aria-pressed={day === draft}
                whileTap={lessMotion?undefined:{scale:.84}} transition={SPRING}
                onClick={() => previewDate(day)}>{parseLocalDay(day).getDate()}</motion.button>)}
            </div>
          </>}
          <div className="calendar-picker-footer">
            <button type="button" onClick={() => commit('')}>Clear</button>
            <button type="button" onClick={close}>Cancel</button>
            <button className="calendar-picker-confirm" type="button"
              disabled={Boolean(draft && !parseLocalDay(draft))}
              onClick={() => commit(draft)}><Check size={17}/> OK</button>
          </div>
        </motion.section>
      </motion.div>}
    </AnimatePresence>, document.body)}
  </>
}

export function ExpressiveTimePicker({value, onChange, feel, lessMotion=false, disabled=false}) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState('dial')
  const [hours, setHours] = useState(9)
  const [minutes, setMinutes] = useState(0)
  const [period, setPeriod] = useState('AM')
  const [unit, setUnit] = useState('hour')
  const triggerRef = useRef(null)
  const dialogRef = useRef(null)
  const pointerRef = useRef(null)
  const lastDialRef = useRef(null)
  const currentRef = useRef({hours,minutes,unit})
  currentRef.current = {hours,minutes,unit}
  const close = () => {setOpen(false); triggerRef.current?.focus()}
  usePickerKeyboard(open, dialogRef, triggerRef, close)
  useEffect(() => {
    if (!open) return
    const [h, m] = /^([01]\d|2[0-3]):[0-5]\d$/.test(value || '') ? value.split(':').map(Number) : [9, 0]
    setHours(h % 12 || 12); setMinutes(m); setPeriod(h >= 12 ? 'PM' : 'AM')
    setUnit('hour')
  }, [open, value])
  const selectDial = (number, advance=false) => {
    const state = currentRef.current
    if (state.unit === 'hour') {
      if (state.hours !== number) {currentRef.current.hours = number; setHours(number); feel?.('selection')}
      if (advance) {currentRef.current.unit = 'minute'; setUnit('minute')}
    } else if (state.minutes !== number) {
      currentRef.current.minutes = number; setMinutes(number); feel?.('selection')
    }
  }
  const chooseAtPointer = event => {
    const valueAtPoint = clockDialValue(event.clientX, event.clientY,
      event.currentTarget.getBoundingClientRect(), currentRef.current.unit)
    if (valueAtPoint === null || valueAtPoint === lastDialRef.current) return
    lastDialRef.current = valueAtPoint
    selectDial(valueAtPoint)
  }
  const onDialDown = event => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    pointerRef.current = event.pointerId
    lastDialRef.current = null
    event.currentTarget.setPointerCapture(event.pointerId)
    chooseAtPointer(event)
  }
  const onDialMove = event => {
    if (pointerRef.current === event.pointerId) chooseAtPointer(event)
  }
  const onDialUp = event => {
    if (pointerRef.current !== event.pointerId) return
    pointerRef.current = null
    const didSelect = lastDialRef.current !== null
    lastDialRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    if (didSelect && currentRef.current.unit === 'hour') {
      currentRef.current.unit = 'minute'
      setUnit('minute')
    }
  }
  const updateHour = value => {
    const n = clamp(Number(value) || 1, 1, 12)
    if (hours === n) return
    currentRef.current.hours = n; setHours(n); feel?.('selection')
  }
  const updateMinute = value => {
    const n = clamp(Number(value) || 0, 0, 59)
    if (minutes === n) return
    currentRef.current.minutes = n; setMinutes(n); feel?.('selection')
  }
  const save = () => {
    const hour24 = hours % 12 + (period === 'PM' ? 12 : 0)
    const next = String(hour24).padStart(2,'0') + ':' + String(minutes).padStart(2,'0')
    if (next !== (value || '')) {onChange(next); feel?.('action')}
    close()
  }
  return <>
    <button ref={triggerRef} type="button" className="calendar-picker-trigger" disabled={disabled}
      aria-haspopup="dialog" aria-expanded={open}
      onClick={() => {setMode('dial'); setOpen(true); feel?.('action')}}>
      <Clock3 size={18}/><span>{timeLabel(value) || 'Set time'}</span><ChevronRight size={16}/>
    </button>
    {createPortal(<AnimatePresence>
      {open && <motion.div className="calendar-picker-shade" initial={{opacity:0}} animate={{opacity:1}}
        exit={{opacity:0}} transition={{duration:lessMotion?0:.16}}
        onMouseDown={event => {if (event.target === event.currentTarget) close()}}>
        <motion.section ref={dialogRef} tabIndex={-1} className="calendar-picker-dialog calendar-time-dialog"
          role="dialog" aria-modal="true" aria-label="Choose task time"
          initial={lessMotion?false:{opacity:0,y:24,scale:.965}}
          animate={{opacity:1,y:0,scale:1}}
          exit={lessMotion?{opacity:0}:{opacity:0,y:10,scale:.975}}
          transition={lessMotion?{duration:0}:SPRING}>
          <div className="calendar-picker-top">
            <span>SELECT TIME</span>
            <button type="button" aria-label="Close time picker" onClick={close}><X size={20}/></button>
          </div>
          <div className="calendar-time-digits" aria-label="Selected time">
            <button type="button" className={unit === 'hour' ? 'is-selected' : ''}
              aria-pressed={unit === 'hour'} aria-label="Select hours"
              onClick={() => {if (unit !== 'hour') {currentRef.current.unit='hour';setUnit('hour');feel?.('selection')}}}>{String(hours).padStart(2,'0')}</button>
            <span>:</span>
            <button type="button" className={unit === 'minute' ? 'is-selected' : ''}
              aria-pressed={unit === 'minute'} aria-label="Select minutes"
              onClick={() => {if (unit !== 'minute') {currentRef.current.unit='minute';setUnit('minute');feel?.('selection')}}}>{String(minutes).padStart(2,'0')}</button>
            <div className="calendar-time-period">
              {['AM','PM'].map(p => <button type="button" key={p} aria-pressed={period === p}
                className={period === p ? 'is-selected' : ''}
                onClick={() => {if (p !== period) {setPeriod(p);feel?.('selection')}}}>{p}</button>)}
            </div>
          </div>
          {mode === 'dial' ?
            <div className="calendar-clock" role="group" aria-label={unit === 'hour' ? 'Choose hour, drag on dial' : 'Choose minute, drag on dial'}
              onPointerDown={onDialDown} onPointerMove={onDialMove}
              onPointerUp={onDialUp} onPointerCancel={onDialUp}>
              <div className="calendar-clock-hand" aria-hidden="true"
                style={{transform:'rotate(' + (180+(unit==='hour'?hours%12*30:minutes*6)) + 'deg)'}}/>
              {Array.from({length:12},(_,i) => {
                const n = unit === 'hour' ? (i || 12) : i*5
                const angle = i*Math.PI/6-Math.PI/2
                const active = unit === 'hour' ? hours === n : minutes === n
                return <button type="button" key={i}
                  aria-label={unit === 'hour' ? n+' o’clock' : n+' minutes'} aria-pressed={active}
                  className={active ? 'is-selected' : ''}
                  style={{left:(50+39*Math.cos(angle))+'%',top:(50+39*Math.sin(angle))+'%'}}
                  onClick={event => {if (event.detail === 0) selectDial(n,true)}}>
                  {unit === 'hour' ? n : String(n).padStart(2,'0')}
                </button>
              })}
            </div>
          : <div className="calendar-time-inputs">
              <label>Hour<input type="number" inputMode="numeric" min="1" max="12" value={hours}
                onChange={event => updateHour(event.target.value)}/></label>
              <label>Minute<input type="number" inputMode="numeric" min="0" max="59" value={minutes}
                onChange={event => updateMinute(event.target.value)}/></label>
            </div>}
          <div className="calendar-picker-footer">
            <button type="button" aria-label={mode==='dial'?'Use keyboard entry':'Use clock dial'}
              onClick={() => {setMode(m=>m==='dial'?'input':'dial');feel?.('selection')}}>
              {mode==='dial'?<Keyboard size={20}/>:<Clock3 size={20}/>}
            </button>
            <button type="button" onClick={() => {if (value) {onChange('');feel?.('action')}close()}}>Clear</button>
            <button type="button" onClick={close}>Cancel</button>
            <button className="calendar-picker-confirm" type="button" onClick={save}><Check size={17}/> OK</button>
          </div>
        </motion.section>
      </motion.div>}
    </AnimatePresence>, document.body)}
  </>
}
