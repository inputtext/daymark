import { useEffect, useRef, useState } from 'react'
import { animate, motion, useMotionValue } from 'motion/react'
import { Check, Clock3, GripVertical, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { SPRING } from '../lib/gestures.js'
import { CALENDAR_REVEAL_OFFSET, calendarSwipeDecision } from '../lib/calendarGestures.js'
import { timeLabel } from '../lib/calendar.js'
import { ExpressiveDatePicker } from './ExpressivePickers.jsx'

/** The timeline's left swipe reveals explicit, non-destructive actions.
 * Deletion is NEVER triggered by swipe alone; parent handles confirmation.
 * Mouse dragging to a calendar date is limited to a dedicated handle.
 */
export default function CalendarTimelineTask({
  task,selected,onEdit,onDelete,onMove,onDesktopDragStart,onDesktopDragEnd,
  busy=false,feel,lessMotion=false,
}) {
  const x=useMotionValue(0)
  const [revealed,setRevealed]=useState(false)
  const rootRef=useRef(null)
  const crossed=useRef(false)

  const snap=value=>{
    if(lessMotion)x.set(value)
    else animate(x,value,{...SPRING,stiffness:400,damping:32})
  }
  const close=()=>{
    setRevealed(false)
    snap(0)
  }
  const toggleActions=()=>{
    if(busy)return
    if(revealed) close()
    else {
      setRevealed(true)
      snap(CALENDAR_REVEAL_OFFSET)
      feel?.('selection')
    }
  }
  useEffect(()=>{
    if(!revealed)return
    const outside=event=>{
      if(rootRef.current&&!rootRef.current.contains(event.target))close()
    }
    const escape=event=>{
      if(event.key==='Escape') {
        event.preventDefault()
        close()
        rootRef.current?.querySelector('.daymark-timeline-more')?.focus()
      }
    }
    document.addEventListener('pointerdown',outside)
    document.addEventListener('keydown',escape)
    return()=>{
      document.removeEventListener('pointerdown',outside)
      document.removeEventListener('keydown',escape)
    }
  },[revealed,lessMotion,x])
  const dragEnd=(_event,info)=>{
    const decision=calendarSwipeDecision(x.get(),info.velocity.x)
    if(decision==='reveal'){
      setRevealed(true)
      snap(CALENDAR_REVEAL_OFFSET)
      if(!crossed.current)feel?.('selection')
    }else close()
    crossed.current=false
  }
  const edit=()=>{if(busy)return;close();feel?.('action');onEdit(task)}
  const remove=()=>{if(busy)return;close();void onDelete(task)}
  const taskTitle=task.title||'Untitled task'

  return <article ref={rootRef}
    className={'daymark-timeline-slide'+(revealed?' is-revealed':'')}
    aria-label={'Calendar task: '+taskTitle}>
    <div className="daymark-timeline-swipe-actions" aria-hidden={!revealed}>
      <button type="button" className="daymark-timeline-reveal-edit"
        tabIndex={revealed?0:-1} disabled={busy} aria-label={'Edit '+taskTitle} onClick={edit}>
        <Pencil size={20}/>
      </button>
      <button type="button" className="daymark-timeline-reveal-delete"
        tabIndex={revealed?0:-1} disabled={busy} aria-label={'Delete '+taskTitle} onClick={remove}>
        <Trash2 size={20}/>
      </button>
    </div>
    <motion.div
      className={'daymark-timeline-task'+(task.is_complete?' is-done':'')}
      style={{x}}
      drag={busy?false:'x'}
      dragConstraints={{left:-116,right:0}}
      dragElastic={.1}
      dragMomentum={false}
      whileDrag={lessMotion?undefined:{scale:.985}}
      onDragStart={()=>{crossed.current=false}}
      onDrag={()=>{
        if(x.get()<=-66 && !crossed.current){crossed.current=true;feel?.('selection')}
      }}
      onDragEnd={dragEnd}
    >
      <div className={'daymark-timeline-priority priority-'+task.priority}/>
      <div className="daymark-timeline-copy">
        <strong>{task.is_complete&&<Check size={14}/>} {taskTitle}</strong>
        {task.notes&&<p>{task.notes}</p>}
        <span>{task.due_time?<><Clock3 size={13}/>{timeLabel(task.due_time)}</>:'Anytime'}</span>
      </div>
      <div className="daymark-timeline-actions">
        <button type="button" disabled={busy} onClick={edit}>Edit</button>
        <ExpressiveDatePicker value={task.due_date||selected} label="Move date" feel={feel}
          lessMotion={lessMotion} ariaLabel={'Move '+taskTitle+' to another date'}
          onChange={day=>{if(day)void onMove(task,day)}}/>
      </div>
      <button type="button" className="daymark-timeline-more" disabled={busy}
        aria-label={'More actions for '+taskTitle} aria-expanded={revealed}
        onClick={toggleActions}><MoreHorizontal size={20}/></button>
      <button type="button" className="daymark-timeline-drag-handle" title="Drag to calendar date"
        aria-label={'Drag '+taskTitle+' onto another calendar date (mouse only)'}
        draggable={!busy} disabled={busy}
        onDragStart={event=>{
          event.dataTransfer.setData('application/x-daymark-task',String(task.id))
          event.dataTransfer.effectAllowed='move'
          onDesktopDragStart?.(task)
        }}
        onDragEnd={()=>onDesktopDragEnd?.()}><GripVertical size={17}/></button>
    </motion.div>
  </article>
}
