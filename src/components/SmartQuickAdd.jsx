import {useEffect,useMemo,useRef,useState} from 'react'
import {createPortal} from 'react-dom'
import {AnimatePresence,motion} from 'motion/react'
import {
  ArrowRight, BellRing, CalendarDays, Check, ChevronRight, CircleAlert,
  Clock3, Keyboard, Lightbulb, ListTodo, Plus, ShieldCheck, Sparkles, X,
} from 'lucide-react'
import {addLocalDays,localISO,parseLocalDay,timeLabel} from '../lib/calendar.js'
import {parseQuickAdd,quickAddReminderPreview} from '../lib/quickAdd.js'
import {isAndroidIslandSupported} from '../lib/island.js'

const SHEET_SPRING={type:'spring',stiffness:380,damping:34,mass:.88}
const CHIP_SPRING={type:'spring',stiffness:390,damping:27,mass:.76}
const samples=[
  'Submit assignment tomorrow at 9 AM',
  'Call home tonight',
  'Review project next Monday at 10 AM',
]
const prettyDate=day=>parseLocalDay(day)?.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})||'Pick date'
const dateChoices=(today)=>[
  {label:'Today',value:today},
  {label:'Tomorrow',value:addLocalDays(today,1)},
]
const assistPriority=(priority)=>priority==='high'?'High priority':priority==='low'?'Low priority':'Normal priority'

export default function SmartQuickAdd({
  initialDue='',busy=false,onSave,onMoreDetails,onClose,feel,reducedMotion=false,offline=false,
}){
  const [input,setInput]=useState('')
  const [overrides,setOverrides]=useState({date:null,time:null,priority:null})
  const [reminderChoice,setReminderChoice]=useState(null)
  const [showExamples,setShowExamples]=useState(true)
  const box=useRef(null),inputRef=useRef(null)
  const baseNow=useRef(new Date()).current
  const today=localISO(baseNow)
  const parsed=useMemo(()=>parseQuickAdd(input,{now:new Date()}),[input])
  const dueDate=overrides.date??parsed.due_date??initialDue??''
  const dueTime=overrides.time??parsed.due_time??''
  const priority=overrides.priority??parsed.priority
  const preview=useMemo(()=>dueDate&&dueTime
    ?quickAddReminderPreview(dueDate,dueTime,{now:new Date()}):null,[dueDate,dueTime,input,overrides])
  const validReminder=Boolean(preview?.valid && isAndroidIslandSupported())
  const remind=reminderChoice===null ? Boolean(parsed.reminderSuggested&&validReminder)
    : reminderChoice&&validReminder
  const cleanTitle=parsed.title.trim()
  const canSave=Boolean(cleanTitle && !busy && !offline && parsed.issues.length===0)
  const submit=e=>{
    e.preventDefault()
    if(!canSave)return
    onSave({
      title:cleanTitle.slice(0,240),notes:'',due_date:dueDate||null,
      due_time:dueDate&&dueTime?dueTime:null,priority,
      remind_at_time:Boolean(dueDate&&dueTime&&remind),
    })
  }
  const example=sample=>{
    setInput(sample)
    setOverrides({date:null,time:null,priority:null})
    setReminderChoice(null)
    setShowExamples(false)
    feel?.('selection')
    inputRef.current?.focus()
  }
  const editInput=e=>{
    setInput(e.target.value)
    setOverrides({date:null,time:null,priority:null})
    setReminderChoice(null)
    setShowExamples(false)
  }
  const pick=(field,value)=>{
    setOverrides(previous=>({...previous,[field]:value}))
    feel?.('selection')
  }
  const details=()=>onMoreDetails({
    title:cleanTitle||input.trim(),notes:'',due_date:dueDate||null,
    due_time:dueDate&&dueTime?dueTime:null,priority,
    remind_at_time:remind,
  })
  useEffect(()=>{
    inputRef.current?.focus()
    const trap=e=>{
      if(e.key==='Escape'){e.stopPropagation();if(!busy)onClose();return}
      if(e.key!=='Tab'||!box.current)return
      const targets=[...box.current.querySelectorAll('button:not(:disabled),textarea:not(:disabled),input:not(:disabled),select:not(:disabled)')]
        .filter(el=>el.getClientRects().length)
      if(!targets.length)return
      if(e.shiftKey&&document.activeElement===targets[0]){e.preventDefault();targets.at(-1).focus()}
      else if(!e.shiftKey&&document.activeElement===targets.at(-1)){e.preventDefault();targets[0].focus()}
    }
    document.addEventListener('keydown',trap,true)
    return()=>document.removeEventListener('keydown',trap,true)
  },[onClose,busy])

  return createPortal(
    <motion.div className="smart-add-shade" role="presentation"
      initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
      transition={{duration:reducedMotion?0:.18}}
      onPointerDown={e=>{if(e.target===e.currentTarget&&!busy)onClose()}}>
      <motion.section ref={box} role="dialog" aria-modal="true" aria-labelledby="smart-add-title"
        className="smart-add-sheet"
        initial={reducedMotion?false:{opacity:0,y:75,scale:.89,borderRadius:60}}
        animate={{opacity:1,y:0,scale:1,borderRadius:36}}
        exit={reducedMotion?{opacity:0}:{opacity:0,y:45,scale:.94}}
        transition={reducedMotion?{duration:0}:SHEET_SPRING}>
        <div className="smart-add-handle" aria-hidden="true"/>
        <header className="smart-add-head">
          <div className="smart-add-heading">
            <span className="smart-add-mark"><Sparkles size={22}/></span>
            <span className="smart-add-heading-copy"><span className="smart-add-kicker">DAYMARK · OFFLINE SMART ENTRY</span><h2 id="smart-add-title">Quick add<span className="smart-add-dot">.</span></h2></span>
          </div>
          <button className="smart-add-icon-button" type="button" aria-label="Close Quick Add" disabled={busy} onClick={onClose}><X size={21}/></button>
        </header>
        <form onSubmit={submit} className="smart-add-form">
          <div className="smart-add-input-card">
            <label htmlFor="smart-add-query"><span className="smart-add-input-label"><Lightbulb size={16}/> What needs doing?</span></label>
            <textarea ref={inputRef} id="smart-add-query" rows={2} maxLength={300}
              autoComplete="off" autoCorrect="on" value={input} onChange={editInput}
              placeholder="Submit assignment tomorrow at 9 AM"
              aria-describedby="smart-add-private"/>
            <div className="smart-add-input-footer"><span id="smart-add-private"><ShieldCheck size={14}/> Parsed on your device</span><span>{input.length}/300</span></div>
          </div>
          {showExamples && <div className="smart-add-examples">
            <span className="smart-add-section-caption">TRY ONE</span>
            {samples.map(sample=><button type="button" key={sample} onClick={()=>example(sample)} className="smart-add-example"><Sparkles size={14}/><span>{sample}</span><ArrowRight size={14}/></button>)}
          </div>}
          <AnimatePresence mode="wait">
            {input.trim()&&<motion.div key={parsed.title+parsed.due_date+parsed.due_time+parsed.priority}
              className="smart-add-parsed"
              initial={reducedMotion?false:{opacity:0,y:12,scale:.98}}
              animate={{opacity:1,y:0,scale:1}} exit={reducedMotion?{opacity:0}:{opacity:0,y:-6}}
              transition={reducedMotion?{duration:0}:CHIP_SPRING}>
              <div className="smart-add-preview-top">
                <span className="smart-add-preview-icon"><ListTodo size={18}/></span>
                <div><small>YOUR TASK</small><strong>{cleanTitle||'Give your task a name'}</strong></div>
                {parsed.hasSuggestions&&<span className="smart-add-detected"><Check size={12}/> Parsed</span>}
              </div>
              <div className="smart-add-preview-tags">
                {dueDate&&<span><CalendarDays size={15}/>{prettyDate(dueDate)}</span>}
                {dueDate&&dueTime&&<span><Clock3 size={15}/>{timeLabel(dueTime)}</span>}
                <span className={'smart-add-priority smart-add-priority-'+priority}>{assistPriority(priority)}</span>
              </div>
            </motion.div>}
          </AnimatePresence>
          <div className="smart-add-tools">
            <span className="smart-add-section-caption">SUGGESTED DETAILS</span>
            <div className="smart-add-date-choices">
              {dateChoices(today).map(choice=><motion.button key={choice.value} type="button"
                whileTap={reducedMotion?undefined:{scale:.95}}
                className={'smart-add-chip'+(dueDate===choice.value?' selected':'')}
                aria-pressed={dueDate===choice.value} onClick={()=>pick('date',choice.value)}>
                <CalendarDays size={15}/>{choice.label}</motion.button>)}
              <motion.button type="button" whileTap={reducedMotion?undefined:{scale:.95}}
                className={'smart-add-chip'+(dueTime==='20:00'?' selected':'')}
                onClick={()=>{pick('date',dueDate||today);pick('time','20:00')}}>
                <Clock3 size={15}/> 8 PM
              </motion.button>
              <motion.button type="button" whileTap={reducedMotion?undefined:{scale:.95}}
                className={'smart-add-chip'+(priority==='high'?' selected':'')}
                aria-pressed={priority==='high'} onClick={()=>pick('priority',priority==='high'?'medium':'high')}>
                <Sparkles size={15}/> High priority
              </motion.button>
            </div>
            <div className="smart-add-picker-row">
              <label className="smart-add-picker"><span><CalendarDays size={16}/> Date</span>
                <input aria-label="Task due date" type="date" value={dueDate} onChange={e=>{pick('date',e.target.value);if(!e.target.value)pick('time','')}}/></label>
              <label className="smart-add-picker"><span><Clock3 size={16}/> Time</span>
                <input aria-label="Task due time" type="time" value={dueTime} disabled={!dueDate} onChange={e=>pick('time',e.target.value)}/></label>
            </div>
          </div>
          <div className={'smart-add-reminder'+(remind?' is-on':'')}>
            <div className="smart-add-reminder-symbol"><BellRing size={20}/></div>
            <div className="smart-add-reminder-copy">
              <strong>Reminder preview</strong>
              <span role="status">{!dueDate||!dueTime?'Choose a date and time to preview a reminder.':
                !preview?.valid?preview?.label:!isAndroidIslandSupported()?'Android app notifications available on your phone.':
                (remind?'Remind at ':'Scheduled time · ')+preview.label}</span>
            </div>
            {isAndroidIslandSupported()&&<label className="smart-add-switch" aria-label="Remind at due time">
              <input type="checkbox" checked={Boolean(remind)} disabled={!preview?.valid||busy}
                onChange={e=>{setReminderChoice(e.target.checked);feel?.('selection')}}/>
              <span aria-hidden="true"/>
            </label>}
          </div>
          {parsed.issues.length>0&&<div className="smart-add-warning" role="alert"><CircleAlert size={19}/><span>{parsed.issues.join(' ')}</span></div>}
          {offline&&<div className="smart-add-warning" role="status"><CircleAlert size={19}/> Cloud tasks need an internet connection. Your Notes can still be edited offline.</div>}
          <footer className="smart-add-actions">
            <button className="smart-add-details" type="button" disabled={busy} onClick={details}><Keyboard size={16}/> More details <ChevronRight size={17}/></button>
            <motion.button className="smart-add-create" type="submit" disabled={!canSave}
              whileTap={reducedMotion?undefined:{scale:.95}} transition={SHEET_SPRING}>
              <Plus size={19}/>{busy?'Adding…':'Add task'}<ArrowRight size={18}/>
            </motion.button>
          </footer>
        </form>
      </motion.section>
    </motion.div>,document.body
  )
}
