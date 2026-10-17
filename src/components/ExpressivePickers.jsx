import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { CalendarDays, ChevronLeft, ChevronRight, Check, Clock3, Keyboard, X } from 'lucide-react'
import { addLocalDays, localISO, monthDates, monthStart, parseLocalDay, shiftMonth, timeLabel } from '../lib/calendar.js'
import { SPRING } from '../lib/gestures.js'

const WEEK = ['S','M','T','W','T','F','S']
const labelMonth = iso => parseLocalDay(iso).toLocaleDateString('en-US',{month:'long',year:'numeric'})
const clamp = (n,min,max) => Math.max(min,Math.min(max,n))

/** Material 3-inspired picker built for Daymark's React/Capacitor WebView.
 * It is NOT a Jetpack Compose or Google-provided UI component.
 */
export function ExpressiveDatePicker({value,onChange,feel,lessMotion=false,label='Choose date'}) {
  const [open,setOpen]=useState(false)
  const [month,setMonth]=useState(monthStart(value||localISO(new Date())))
  const [inputMode,setInputMode]=useState(false)
  const [draft,setDraft]=useState(value||'')
  const titleRef=useRef(null)
  useEffect(()=>{if(open){setDraft(value||'');setMonth(monthStart(value||localISO(new Date())))}},[open,value])
  useEffect(()=>{
    if(!open)return
    const handler=e=>{if(e.key==='Escape')setOpen(false)}
    document.addEventListener('keydown',handler)
    titleRef.current?.focus()
    return()=>document.removeEventListener('keydown',handler)
  },[open])
  const cells=useMemo(()=>monthDates(month),[month])
  const commit=day=>{if(day && !parseLocalDay(day))return;onChange(day);feel?.('selection');setOpen(false)}
  return <>
    <button className="calendar-picker-trigger" type="button" onClick={()=>{feel?.('action');setOpen(true)}} aria-haspopup="dialog">
      <CalendarDays size={17}/>{value?parseLocalDay(value)?.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):label}<ChevronRight size={16}/>
    </button>
    {createPortal(<AnimatePresence>{open&&<motion.div className="calendar-picker-shade" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:lessMotion?0:.16}} onMouseDown={e=>{if(e.target===e.currentTarget)setOpen(false)}}>
      <motion.section className="calendar-picker-dialog" role="dialog" aria-modal="true" aria-label="Choose task due date" initial={lessMotion?false:{opacity:0,y:20,scale:.96}} animate={{opacity:1,y:0,scale:1}} exit={lessMotion?{opacity:0}:{opacity:0,y:12,scale:.97}} transition={lessMotion?{duration:0}:SPRING}>
        <div className="calendar-picker-top"><span>SELECT DATE</span><button type="button" aria-label="Close date picker" onClick={()=>setOpen(false)}><X size={20}/></button></div>
        <div className="calendar-picker-selected"><strong>{draft&&parseLocalDay(draft)?parseLocalDay(draft).toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'}):'No date'}</strong><button type="button" onClick={()=>setInputMode(v=>!v)} aria-label={inputMode?'Show calendar':'Enter date'}>{inputMode?<CalendarDays size={19}/>:<Keyboard size={19}/>}</button></div>
        {inputMode?<label className="calendar-picker-input">Enter date <input type="date" value={draft} onChange={e=>setDraft(e.target.value)}/></label>:<>
          <div className="calendar-picker-month"><strong>{labelMonth(month)}</strong><div><button type="button" aria-label="Previous month" onClick={()=>setMonth(shiftMonth(month,-1))}><ChevronLeft size={19}/></button><button type="button" aria-label="Next month" onClick={()=>setMonth(shiftMonth(month,1))}><ChevronRight size={19}/></button></div></div>
          <div className="calendar-picker-grid">{WEEK.map((d,i)=><span key={i} className="calendar-picker-weekday">{d}</span>)}
            {cells.map(day=><button key={day} type="button" aria-label={parseLocalDay(day).toDateString()} aria-pressed={day===draft} className={'calendar-picker-day'+(day===draft?' is-picked':'')+(day.slice(0,7)!==month.slice(0,7)?' is-outside':'')} onClick={()=>{setDraft(day);feel?.('selection')}}>{parseLocalDay(day).getDate()}</button>)}
          </div>
        </>}
        <div className="calendar-picker-footer"><button type="button" onClick={()=>commit('')}>Clear</button><button type="button" onClick={()=>setOpen(false)}>Cancel</button><button className="calendar-picker-confirm" type="button" onClick={()=>commit(draft)}><Check size={16}/> OK</button></div>
      </motion.section>
    </motion.div>}</AnimatePresence>, document.body)}
  </>
}

export function ExpressiveTimePicker({value,onChange,feel,lessMotion=false}) {
  const [open,setOpen]=useState(false)
  const [mode,setMode]=useState('dial')
  const [hours,setHours]=useState(9)
  const [minutes,setMinutes]=useState(0)
  const [period,setPeriod]=useState('AM')
  const [unit,setUnit]=useState('hour')
  useEffect(()=>{
    if(!open)return
    const [h,m]=/^\d{2}:\d{2}$/.test(value||'')?value.split(':').map(Number):[9,0]
    setHours(h%12||12);setMinutes(m);setPeriod(h>=12?'PM':'AM');setUnit('hour')
    const handler=e=>{if(e.key==='Escape')setOpen(false)}
    document.addEventListener('keydown',handler)
    return()=>document.removeEventListener('keydown',handler)
  },[open,value])
  const choose=(n)=>{
    if(unit==='hour'){setHours(n===0?12:n);setUnit('minute')}else setMinutes(n)
    feel?.('selection')
  }
  const save=()=>{
    const hour24=hours%12+(period==='PM'?12:0)
    onChange(String(hour24).padStart(2,'0')+':'+String(minutes).padStart(2,'0'))
    feel?.('action');setOpen(false)
  }
  return <>
    <button type="button" className="calendar-picker-trigger" onClick={()=>{feel?.('action');setOpen(true)}}><Clock3 size={17}/>{timeLabel(value)||'Set time'}<ChevronRight size={16}/></button>
    {createPortal(<AnimatePresence>{open&&<motion.div className="calendar-picker-shade" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onMouseDown={e=>{if(e.target===e.currentTarget)setOpen(false)}}>
      <motion.section className="calendar-picker-dialog calendar-time-dialog" role="dialog" aria-modal="true" aria-label="Choose task time" initial={lessMotion?false:{opacity:0,y:24,scale:.95}} animate={{opacity:1,y:0,scale:1}} exit={lessMotion?{opacity:0}:{opacity:0,y:10}} transition={lessMotion?{duration:0}:SPRING}>
        <div className="calendar-picker-top"><span>ENTER TIME</span><button type="button" aria-label="Close time picker" onClick={()=>setOpen(false)}><X size={20}/></button></div>
        <div className="calendar-time-digits"><button className={unit==='hour'?'is-selected':''} type="button" onClick={()=>setUnit('hour')}>{String(hours).padStart(2,'0')}</button><span>:</span><button className={unit==='minute'?'is-selected':''} type="button" onClick={()=>setUnit('minute')}>{String(minutes).padStart(2,'0')}</button><div className="calendar-time-period">{['AM','PM'].map(p=><button key={p} type="button" aria-pressed={period===p} className={period===p?'is-selected':''} onClick={()=>{setPeriod(p);feel?.('selection')}}>{p}</button>)}</div></div>
        {mode==='dial'?<div className="calendar-clock" role="group" aria-label={unit==='hour'?'Choose hour':'Choose minute'}>
          <div className="calendar-clock-hand" style={{transform:'rotate('+(180+(unit==='hour'?hours%12*30:minutes*6))+'deg)'}}/>
          {Array.from({length:12},(_,i)=>{const n=unit==='hour'?(i||12):i*5;const angle=i*Math.PI/6-Math.PI/2;const active=unit==='hour'?hours===n:minutes===n;return <button key={i} type="button" aria-label={unit==='hour'?n+' o’clock':n+' minutes'} className={active?'is-selected':''} style={{left:(50+39*Math.cos(angle))+'%',top:(50+39*Math.sin(angle))+'%'}} onClick={()=>choose(n)}>{unit==='hour'?n:String(n).padStart(2,'0')}</button>})}
        </div>:<div className="calendar-time-inputs"><label>Hour<input type="number" min="1" max="12" value={hours} onChange={e=>setHours(clamp(Number(e.target.value)||1,1,12))}/></label><label>Minute<input type="number" min="0" max="59" value={minutes} onChange={e=>setMinutes(clamp(Number(e.target.value)||0,0,59))}/></label></div>}
        <div className="calendar-picker-footer"><button type="button" aria-label={mode==='dial'?'Use keyboard entry':'Use clock dial'} onClick={()=>setMode(v=>v==='dial'?'input':'dial')}>{mode==='dial'?<Keyboard size={18}/>:<Clock3 size={18}/>}</button><button type="button" onClick={()=>{onChange('');setOpen(false)}}>Clear</button><button type="button" onClick={()=>setOpen(false)}>Cancel</button><button className="calendar-picker-confirm" type="button" onClick={save}><Check size={16}/> OK</button></div>
      </motion.section>
    </motion.div>}</AnimatePresence>, document.body)}
  </>
}
