import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import {
  ArrowLeft, ArrowRight, BellRing, CalendarDays, Check, CheckCircle2,
  ChevronRight, Clock3, Fingerprint, LockKeyhole, Plus, ShieldCheck,
  Sparkles, StickyNote, Sun, Wifi,
} from 'lucide-react'

export const ONBOARDING_KEY='daymark:onboarding:v1'
export const ONBOARDING_STAGES=[
  {id:'welcome',eyebrow:'YOUR DAY, YOUR WAY',title:'A little more',accent:'space to breathe.',description:'Meet Daymark. A calmer place for everything on your mind, and everything you want to do.'},
  {id:'tasks',eyebrow:'PLAN WITH PURPOSE',title:'Make plans.',accent:'Make progress.',description:'Capture tasks, plan your calendar, and turn those little checkmarks into momentum.'},
  {id:'notes',eyebrow:'KEEP YOUR SPARK',title:'Ideas deserve',accent:'a home.',description:'Save quick notes in a tap. Your signed-in notes can sync with your account, even if you write them offline.'},
  {id:'reminders',eyebrow:'STAY IN YOUR FLOW',title:'Remember more.',accent:'Worry less.',description:'Get timely task reminders and choose an optional device lock to keep your personal workspace private.'},
]
export function hasSeenOnboarding(storage) {
  try { return storage?.getItem(ONBOARDING_KEY)==='done' } catch { return false }
}
export function markOnboardingSeen(storage) {
  try { storage?.setItem(ONBOARDING_KEY,'done') } catch { /* onboarding still works without persistent storage */ }
}
const SPRING={type:'spring',stiffness:290,damping:27,mass:.95}
const rise={initial:{opacity:0,y:24,scale:.96},animate:{opacity:1,y:0,scale:1},exit:{opacity:0,y:-19,scale:.97}}
const dayNames=['M','T','W','T','F','S','S']

function Wordmark(){
  return <span className="dm-ob-logo"><span className="dm-ob-logo-mark"><Check size={19} strokeWidth={3.5}/></span><span>daymark<span className="dm-ob-logo-period">.</span></span></span>
}
function Illustration({step,reduced,checked,onCheck}){
  if(step===0) return <div className="dm-ob-art dm-ob-art-welcome">
    <motion.div className="dm-ob-glow" animate={reduced?{}:{scale:[1,1.12,1],rotate:[0,12,0]}} transition={{duration:8,repeat:Infinity,ease:'easeInOut'}}/>
    <motion.div className="dm-ob-orbit dm-ob-orbit-one" animate={reduced?{}:{rotate:360}} transition={{duration:26,repeat:Infinity,ease:'linear'}}/>
    <motion.div className="dm-ob-orbit dm-ob-orbit-two" animate={reduced?{}:{rotate:-360}} transition={{duration:36,repeat:Infinity,ease:'linear'}}/>
    <motion.div className="dm-ob-flower" animate={reduced?{}:{rotate:[-9,14,-9],scale:[1,1.035,1]}} transition={{duration:7,repeat:Infinity,ease:'easeInOut'}}>
      {Array.from({length:8},(_,i)=><span key={i} className="dm-ob-petal" style={{'--petal-index':i}}/>)}
      <span className="dm-ob-flower-center"><Check size={28} strokeWidth={3}/></span>
    </motion.div>
    <motion.div className="dm-ob-float dm-ob-float-one" animate={reduced?{}:{y:[0,-12,0]}} transition={{duration:4,repeat:Infinity}}><Sparkles size={17}/> One day at a time</motion.div>
    <motion.div className="dm-ob-float dm-ob-float-two" animate={reduced?{}:{y:[0,9,0]}} transition={{duration:5,repeat:Infinity}}><Sun size={17}/> Find your flow</motion.div>
  </div>
  if(step===1) return <div className="dm-ob-art dm-ob-art-tasks">
    <div className="dm-ob-calendar">
      <div className="dm-ob-calendar-title"><CalendarDays size={18}/> This week <span>OCT</span></div>
      <div className="dm-ob-calendar-days">{dayNames.map((d,i)=><span key={i} className={i===3?'is-highlighted':''}>{d}<strong>{19+i}</strong></span>)}</div>
    </div>
    <motion.div className="dm-ob-task-card" initial={reduced?false:{opacity:0,y:44,rotate:-4}} animate={{opacity:1,y:0,rotate:-2}} transition={SPRING}>
      <div className="dm-ob-task-heading"><span className="dm-ob-task-icon"><Sparkles size={18}/></span><div><small>YOUR TODAY</small><strong>Little wins add up.</strong></div><span className="dm-ob-task-count">{checked?3:2}/3</span></div>
      <div className="dm-ob-task-item"><span className="dm-ob-task-tick is-done"><Check size={13}/></span><span>Plan my week</span><CheckCircle2 size={17} className="dm-ob-task-side"/></div>
      <button className={'dm-ob-task-item dm-ob-task-demo'+(checked?' is-done':'')} type="button" onClick={onCheck} aria-pressed={checked} aria-label="Try completing a task">
        <span className={'dm-ob-task-tick'+(checked?' is-done':'')}>{checked&&<Check size={13}/>}</span><span>{checked?'Finished that task!':'Finish something small'}</span><span className="dm-ob-task-chip">TRY IT</span>
      </button>
      <div className="dm-ob-task-item"><span className="dm-ob-task-tick is-done"><Check size={13}/></span><span>Take a break</span><CheckCircle2 size={17} className="dm-ob-task-side"/></div>
    </motion.div>
    <motion.span className="dm-ob-tasks-bubble" animate={reduced?{}:{y:[0,-9,0]}} transition={{duration:3.5,repeat:Infinity}}><CheckCircle2 size={17}/> You're doing great</motion.span>
  </div>
  if(step===2) return <div className="dm-ob-art dm-ob-art-notes">
    <div className="dm-ob-note dm-ob-note-back"><div className="dm-ob-note-icon"><StickyNote size={18}/></div><strong>Weekend ideas</strong><p>Find a new cafe<br/>Read a little more</p></div>
    <motion.div className="dm-ob-note dm-ob-note-front" initial={reduced?false:{opacity:0,y:35,rotate:5}} animate={{opacity:1,y:0,rotate:-6}} transition={SPRING}>
      <div className="dm-ob-note-icon"><Sparkles size={19}/></div><strong>A thought worth keeping.</strong>
      <p>That idea you had?<br/>Give it a home.</p>
      <span className="dm-ob-note-label">QUICK NOTE</span>
    </motion.div>
    <motion.span className="dm-ob-note-add" animate={reduced?{}:{rotate:[0,8,0],scale:[1,1.05,1]}} transition={{duration:3,repeat:Infinity}}><Plus size={31}/></motion.span>
    <div className="dm-ob-notes-caption"><Wifi size={17}/> Write offline, sync when online</div>
  </div>
  return <div className="dm-ob-art dm-ob-art-reminders">
    <motion.div className="dm-ob-reminder-halo" animate={reduced?{}:{scale:[1,1.07,1]}} transition={{duration:4,repeat:Infinity}}/>
    <motion.div className="dm-ob-reminder-card" initial={reduced?false:{opacity:0,y:54,scale:.9}} animate={{opacity:1,y:0,scale:1}} transition={SPRING}>
      <div className="dm-ob-reminder-top"><span><BellRing size={19}/></span><strong>daymark.</strong><small>REMINDER</small></div>
      <h3>You've got this.</h3><p>Take a moment to plan tomorrow.</p>
      <div className="dm-ob-reminder-actions"><span><Clock3 size={14}/> Today, 7:00 PM</span><ChevronRight size={18}/></div>
    </motion.div>
    <motion.div className="dm-ob-security-pill" animate={reduced?{}:{y:[0,-7,0]}} transition={{duration:4,repeat:Infinity}}><Fingerprint size={23}/><div><strong>App lock</strong><span>Optional device security</span></div><ShieldCheck size={20}/></motion.div>
    <span className="dm-ob-reminder-star" aria-hidden="true">✳</span>
  </div>
}

export default function Onboarding({onComplete,feel,reducedMotion=false}){
  const systemReduced=useReducedMotion()
  const reduced=Boolean(reducedMotion||systemReduced)
  const [index,setIndex]=useState(0)
  const [checked,setChecked]=useState(false)
  const gesture=useRef(null)
  const last=ONBOARDING_STAGES.length-1
  const stage=ONBOARDING_STAGES[index]
  const go=next=>{
    const target=Math.min(last,Math.max(0,next))
    if(target!==index){feel?.('selection');setIndex(target)}
  }
  // Complete only after the final screen; no Skip or progress-bar shortcuts.
  const finish=()=>{if(index!==last)return;feel?.('success');onComplete()}
  const next=()=>index===last?finish():go(index+1)
  useEffect(()=>{
    const onKey=e=>{
      if(e.altKey||e.ctrlKey||e.metaKey)return
      if(['INPUT','TEXTAREA','SELECT'].includes(e.target?.tagName))return
      if(e.key==='ArrowRight'){e.preventDefault();go(index+1)}
      if(e.key==='ArrowLeft'){e.preventDefault();go(index-1)}
    }
    window.addEventListener('keydown',onKey)
    return()=>window.removeEventListener('keydown',onKey)
  },[index,feel])
  const beginTouch=e=>{if(e.target.closest?.('button'))return;gesture.current={x:e.touches[0]?.clientX,y:e.touches[0]?.clientY}}
  const endTouch=e=>{
    if(!gesture.current)return
    const dx=e.changedTouches[0]?.clientX-gesture.current.x
    const dy=e.changedTouches[0]?.clientY-gesture.current.y
    gesture.current=null
    if(Number.isFinite(dx)&&Math.abs(dx)>65&&Math.abs(dx)>Math.abs(dy)*1.3)go(index+(dx<0?1:-1))
  }
  return <main className="dm-ob-shell" aria-label="Get to know Daymark">
    <div className="dm-ob-background" aria-hidden="true"/>
    <div className="dm-ob-layout">
      <header className="dm-ob-header">
        <Wordmark/>
        <span className="dm-ob-intro-label"><Sparkles size={15}/> YOUR FIRST STEPS</span>
      </header>
      <div className="dm-ob-content" onTouchStart={beginTouch} onTouchEnd={endTouch}>
        <div className="dm-ob-visual" aria-hidden={index!==1}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={stage.id+'-art'} className="dm-ob-visual-inner"
              initial={reduced?false:{opacity:0,x:32,scale:.93}} animate={{opacity:1,x:0,scale:1}}
              exit={reduced?{opacity:0}:{opacity:0,x:-30,scale:.95}} transition={reduced?{duration:0}:{...SPRING}}>
              <Illustration step={index} reduced={reduced} checked={checked} onCheck={()=>{feel?.('complete');setChecked(value=>!value)}}/>
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="dm-ob-copy">
          <div className="dm-ob-step-count"><span className="dm-ob-step-number">{String(index+1).padStart(2,'0')}</span> / {String(ONBOARDING_STAGES.length).padStart(2,'0')}</div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={stage.id+'-copy'} {...(reduced?{initial:false,animate:{opacity:1},exit:{opacity:0},transition:{duration:0}}:{...rise,transition:SPRING})}>
              <span className="dm-ob-eyebrow"><Sparkles size={16}/>{stage.eyebrow}</span>
              <h1>{stage.title}<span>{stage.accent}</span></h1>
              <p>{stage.description}</p>
            </motion.div>
          </AnimatePresence>
          {index===1&&<p className="dm-ob-hint"><CheckCircle2 size={16}/> Tap the task's checkbox above to try it.</p>}
          <div className="dm-ob-progress" aria-label={'Introduction step '+(index+1)+' of '+ONBOARDING_STAGES.length}>
            {ONBOARDING_STAGES.map((item,i)=><span key={item.id} className={'dm-ob-progress-step'+(i===index?' is-active':'')} aria-label={'Introduction screen '+(i+1)+' of '+ONBOARDING_STAGES.length} aria-current={i===index?'step':undefined}><motion.span initial={false} animate={{width:i<=index?'100%':'0%'}} transition={reduced?{duration:0}:SPRING}/></span>)}
          </div>
          <div className="dm-ob-actions">
            {index>0?<button className="dm-ob-back" type="button" onClick={()=>go(index-1)}><ArrowLeft size={20}/> Back</button>:<span className="dm-ob-back-space" aria-hidden="true"/>}
            <motion.button className="dm-ob-next" type="button" onClick={next}
              whileTap={reduced?undefined:{scale:.95}} transition={SPRING}>
              {index===last?'Get started':'Continue'} <ArrowRight size={20}/>
            </motion.button>
          </div>
        </div>
      </div>
      <footer className="dm-ob-footer"><span><LockKeyhole size={15}/> No account needed to explore.</span><span>Made for the little wins. ✦</span></footer>
    </div>
  </main>
}
