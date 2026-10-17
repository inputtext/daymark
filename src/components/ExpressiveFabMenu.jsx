import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Plus, X, ListTodo, NotebookPen, StickyNote } from 'lucide-react'
import { fabGesture } from '../lib/notes.js'
import { SPRING } from '../lib/gestures.js'

/** Thumb-accessible expanded FAB: tap for actions, swipe left for Quick Note,
 * swipe up to fan open. Restrict gestures to the FAB itself so task swipes stay intact.
 */
export default function ExpressiveFabMenu({onNewTask,onQuickNote,onNotes,feel,reducedMotion=false}) {
  const [open,setOpen] = useState(false)
  const root = useRef(null)
  const trigger = useRef(null)
  const pointer = useRef(null)
  const suppressClick = useRef(false)
  const menuId='daymark-fab-menu'
  useEffect(()=>{
    if(!open)return
    const outside = e => {if(root.current&&!root.current.contains(e.target))setOpen(false)}
    const key = e => {
      if(e.key==='Escape'){e.preventDefault();setOpen(false);trigger.current?.focus()}
    }
    document.addEventListener('pointerdown',outside)
    document.addEventListener('keydown',key)
    return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',key)}
  },[open])
  const choose = fn => {setOpen(false);feel?.('action');fn()}
  const start = e => {
    if (e.pointerType==='mouse'&&e.button!==0)return
    pointer.current={id:e.pointerId,x:e.clientX,y:e.clientY}
  }
  const release = e => {
    const p=pointer.current
    pointer.current=null
    if(!p||p.id!==e.pointerId)return
    const outcome=fabGesture(e.clientX-p.x,e.clientY-p.y)
    if(outcome==='tap')return
    suppressClick.current=true
    window.setTimeout(()=>{suppressClick.current=false},180)
    if(outcome==='quick-note')choose(onQuickNote)
    else if(!open){setOpen(true);feel?.('selection')}
  }
  const options=[
    {title:'New task',subtitle:'Plan your next step',Icon:ListTodo,onClick:onNewTask},
    {title:'All notes',subtitle:'Your idea shelf',Icon:StickyNote,onClick:onNotes},
    {title:'Quick note',subtitle:'Capture a thought',Icon:NotebookPen,onClick:onQuickNote},
  ]
  return <div className={'expressive-fab-root'+(open?' is-open':'')} ref={root}>
    <AnimatePresence>
      {open&&<motion.div id={menuId} className="expressive-fab-options" role="menu" aria-label="Quick create actions"
        initial={reducedMotion?false:{opacity:0,y:24,scale:.94}}
        animate={{opacity:1,y:0,scale:1}} exit={reducedMotion?{opacity:0}:{opacity:0,y:14,scale:.96}}
        transition={reducedMotion?{duration:0}:SPRING}>
        {options.map((item,i)=><motion.button key={item.title} type="button" role="menuitem"
          className={'expressive-fab-option'+(item.title==='Quick note'?' is-featured':'')}
          initial={reducedMotion?false:{opacity:0,y:16,scale:.84}}
          animate={{opacity:1,y:0,scale:1}} exit={reducedMotion?{opacity:0}:{opacity:0,y:10,scale:.9}}
          transition={reducedMotion?{duration:0}:{...SPRING,delay:i*.045}}
          onClick={()=>choose(item.onClick)}>
            <span className="expressive-fab-text"><strong>{item.title}</strong><small>{item.subtitle}</small></span>
            <span className="expressive-fab-option-icon"><item.Icon size={21}/></span>
          </motion.button>)}
      </motion.div>}
    </AnimatePresence>
    <motion.button ref={trigger} className="mobile-fab v04-fab expressive-fab-trigger" type="button"
      aria-label={open?'Close quick actions':'Open quick actions: tap or swipe left for note'}
      aria-expanded={open} aria-haspopup="menu" aria-controls={open?menuId:undefined}
      whileTap={reducedMotion?undefined:{scale:.91}} transition={SPRING}
      onPointerDown={start} onPointerUp={release} onPointerCancel={()=>{pointer.current=null}}
      onClick={()=>{if(suppressClick.current)return;setOpen(v=>!v);feel?.('selection')}}>
      <motion.span animate={{rotate:open?135:0}} transition={reducedMotion?{duration:0}:SPRING}><Plus size={27}/></motion.span>
    </motion.button>
  </div>
}
