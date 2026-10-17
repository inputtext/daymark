import { useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, Plus, Sparkles, Check, CalendarClock } from 'lucide-react'
import { addLocalDays, localISO, monthDates, monthStart, parseLocalDay, shiftMonth, sortedDayTasks, tasksOnDay, timeLabel, weekDates, weekStart } from '../lib/calendar.js'
import { SPRING } from '../lib/gestures.js'
const DAYS=['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const monthLabel=day=>parseLocalDay(day).toLocaleDateString('en-US',{month:'long',year:'numeric'})
const longLabel=day=>parseLocalDay(day).toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})
const timeSlots=[{name:'Morning',hours:'06:00 – 11:59',start:'09:00'},{name:'Afternoon',hours:'12:00 – 16:59',start:'13:00'},{name:'Evening',hours:'17:00 – 23:59',start:'18:00'}]
const slotFor=time=>!time?'unscheduled':time<'12:00'?'Morning':time<'17:00'?'Afternoon':'Evening'

/** Full React/Capacitor calendar, styled after Material 3 Expressive patterns.
 * Date tiles accept mouse drag and pointer drag; all moves have button fallback.
 */
export default function ExpressiveCalendar({tasks,selected,onSelect,onCreate,onEdit,onMove,feel,lessMotion=false,busy=false}) {
  const [mode,setMode]=useState('month')
  const [anchor,setAnchor]=useState(monthStart(selected))
  const [dragging,setDragging]=useState(null)
  const pointer=useRef(null)
  const days=useMemo(()=>mode==='month'?monthDates(anchor):weekDates(selected),[mode,anchor,selected])
  const active=useMemo(()=>sortedDayTasks(tasksOnDay(tasks,selected)),[tasks,selected])
  const totals=useMemo(()=>{
    const result=new Map()
    for(const task of tasks)if(task.due_date){const v=result.get(task.due_date)||{all:0,done:0};v.all++;if(task.is_complete)v.done++;result.set(task.due_date,v)}
    return result
  },[tasks])
  const go=delta=>{
    const next=mode==='month'?shiftMonth(anchor,delta):addLocalDays(selected,delta*(mode==='week'?7:1))
    if(mode==='month'){setAnchor(next);onSelect(next)}
    else {onSelect(next);setAnchor(monthStart(next))}
    feel?.('selection')
  }
  const select=day=>{onSelect(day);setAnchor(monthStart(day));feel?.('selection')}
  const move=(task,day)=>{if(!day||day===task.due_date)return;void onMove(task,day)}
  const pointerStart=(event,task)=>{
    if(event.pointerType==='mouse' && event.button!==0)return
    pointer.current={task,x:event.clientX,y:event.clientY,id:event.pointerId,moved:false}
  }
  const pointerMove=event=>{
    const p=pointer.current
    if(!p||p.id!==event.pointerId)return
    if(Math.hypot(event.clientX-p.x,event.clientY-p.y)>11){p.moved=true;setDragging(p.task.id)}
  }
  const pointerEnd=event=>{
    const p=pointer.current
    pointer.current=null;setDragging(null)
    if(!p||!p.moved)return
    const el=document.elementFromPoint(event.clientX,event.clientY)?.closest('[data-calendar-date]')
    if(el)move(p.task,el.dataset.calendarDate)
  }
  const onKeyDate=(event,day)=>{
    if(event.key==='ArrowRight'||event.key==='ArrowLeft'||event.key==='ArrowDown'||event.key==='ArrowUp'){
      event.preventDefault()
      const delta={ArrowRight:1,ArrowLeft:-1,ArrowDown:7,ArrowUp:-7}[event.key]
      const next=addLocalDays(day,delta);select(next)
      requestAnimationFrame(()=>document.querySelector('[data-calendar-date="'+next+'"]')?.focus())
    }
  }
  return <div className="daymark-calendar">
    <section className="daymark-calendar-card" aria-label="Calendar planner">
      <div className="daymark-calendar-head">
        <div><span className="daymark-calendar-eyebrow"><Sparkles size={15}/> YOUR TIME, BEAUTIFULLY ORGANIZED</span><h2>{monthLabel(mode==='month'?anchor:selected)}</h2><p>Pick a date to see your day. Drag tasks to another date.</p></div>
        <div className="daymark-calendar-navigation"><button type="button" onClick={()=>{const d=localISO(new Date());select(d)}}>Today</button><button type="button" aria-label="Previous period" onClick={()=>go(-1)}><ChevronLeft size={20}/></button><button type="button" aria-label="Next period" onClick={()=>go(1)}><ChevronRight size={20}/></button></div>
      </div>
      <div className="daymark-calendar-modes" role="group" aria-label="Calendar view">
        {['month','week','day'].map(value=><button key={value} type="button" className={mode===value?'is-selected':''} aria-pressed={mode===value} onClick={()=>{setMode(value);feel?.('selection')}}>{value==='month'?'Month':value==='week'?'Week':'Day'}</button>)}
      </div>
      {mode!=='day'&&<div className={'daymark-calendar-grid '+(mode==='week'?'is-week':'is-month')} role="group" aria-label={mode==='month'?'Month dates':'Week dates'}>
        {DAYS.map(day=><span key={day} className="daymark-calendar-weekday">{day}</span>)}
        {days.map(day=>{const info=totals.get(day),outside=mode==='month'&&day.slice(0,7)!==anchor.slice(0,7),isToday=day===localISO(new Date());return <motion.button
          key={day} type="button" data-calendar-date={day} aria-label={longLabel(day)+(info?' '+info.all+' tasks':'')} aria-pressed={selected===day}
          className={'daymark-calendar-date'+(selected===day?' is-selected':'')+(outside?' is-outside':'')+(isToday?' is-today':'')+(dragging?' is-drop-target':'')}
          whileTap={lessMotion?undefined:{scale:.92}} transition={SPRING}
          onClick={()=>select(day)} onKeyDown={e=>onKeyDate(e,day)}
          onDragOver={e=>{if(e.dataTransfer.types.includes('application/x-daymark-task'))e.preventDefault()}}
          onDrop={e=>{e.preventDefault();const id=e.dataTransfer.getData('application/x-daymark-task');const task=tasks.find(t=>String(t.id)===id);if(task)move(task,day)}}
        ><span className="daymark-calendar-date-number">{parseLocalDay(day).getDate()}</span>{info&&<span className="daymark-calendar-dots"><i/><span>{info.all}</span></span>}</motion.button>})}
      </div>}
      <div className="daymark-calendar-summary"><span><CalendarDays size={17}/>{longLabel(selected)}</span><strong>{active.length} task{active.length===1?'':'s'}</strong></div>
    </section>
    <section className="daymark-timeline" aria-label="Daily task timeline">
      <div className="daymark-timeline-head"><div><span>DAILY TIMELINE</span><h2>{longLabel(selected)}</h2></div><button className="daymark-calendar-add" type="button" onClick={()=>onCreate(selected)}><Plus size={18}/> Add task</button></div>
      <p className="daymark-calendar-hint">Drag a task onto a calendar date to reschedule it. You can also use its Move button.</p>
      <AnimatePresence mode="wait">
        <motion.div key={selected} initial={lessMotion?false:{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={lessMotion?{opacity:0}:{opacity:0,y:-8}} transition={lessMotion?{duration:0}:{duration:.22}}>
          {active.length===0&&<div className="daymark-timeline-empty"><CalendarClock size={29}/><h3>Room for something good.</h3><p>Nothing scheduled for this day yet.</p><button type="button" onClick={()=>onCreate(selected)}><Plus size={16}/> Plan a task</button></div>}
          {active.length>0&&<div className="daymark-timeline-groups">
            {['Morning','Afternoon','Evening','unscheduled'].map(slot=>{
              const group=active.filter(t=>slotFor(t.due_time)===slot)
              if(!group.length)return null
              return <div className="daymark-timeline-group" key={slot}>
                <div className="daymark-timeline-slot"><span>{slot==='unscheduled'?'Anytime':slot}</span><small>{timeSlots.find(x=>x.name===slot)?.hours||'No time set'}</small></div>
                <div className="daymark-timeline-tasks">{group.map(task=><motion.article key={task.id} layout={!lessMotion} className={'daymark-timeline-task'+(task.is_complete?' is-done':'')+(dragging===task.id?' is-dragging':'')} draggable={!busy}
                  onDragStart={e=>{e.dataTransfer.setData('application/x-daymark-task',String(task.id));e.dataTransfer.effectAllowed='move'}}
                  onPointerDown={e=>pointerStart(e,task)} onPointerMove={pointerMove} onPointerUp={pointerEnd} onPointerCancel={()=>{pointer.current=null;setDragging(null)}}
                  ><div className={'daymark-timeline-priority priority-'+task.priority}/><div className="daymark-timeline-copy"><strong>{task.is_complete&&<Check size={14}/>} {task.title}</strong>{task.notes&&<p>{task.notes}</p>}<span>{task.due_time?<><Clock3 size={13}/>{timeLabel(task.due_time)}</>:'Anytime'}</span></div>
                    <div className="daymark-timeline-actions"><button type="button" onClick={()=>onEdit(task)}>Edit</button><select aria-label={'Move '+task.title+' to another date'} disabled={busy} value="" onChange={e=>{if(e.target.value)move(task,e.target.value)}}>
                      <option value="">Move…</option>{[-7,-1,1,7].map(n=><option key={n} value={addLocalDays(task.due_date||selected,n)}>{n<0?n+' days': '+'+n+' days'}</option>)}
                    </select></div>
                  </motion.article> )}</div>
              </div>
            })}
          </div>}
        </motion.div>
      </AnimatePresence>
    </section>
  </div>
}
