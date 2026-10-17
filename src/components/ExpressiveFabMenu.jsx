import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Plus, ListTodo, NotebookPen, StickyNote } from 'lucide-react'
import { fabGesture } from '../lib/notes.js'

// Quicker, damped Material Expressive-style motion: a small bounce without
// feeling laggy. Reduced-motion mode skips spring transforms altogether.
export const FAB_SPRING = Object.freeze({type:'spring', stiffness:450, damping:26, mass:0.9})
export const FAB_ITEM_SPRING = Object.freeze({type:'spring', stiffness:455, damping:27, mass:0.9})
export const FAB_STAGGER_SECONDS = 0.045

/** Tap opens the action menu. Swipe left on the button for an instant note;
 * swipe up on the button to expand. Deliberately not a screen-edge gesture.
 * The separate Notes workspace is also available in bottom navigation.
 */
export default function ExpressiveFabMenu({onNewTask,onQuickNote,onNotes,feel,reducedMotion=false}) {
  const [open,setOpen] = useState(false)
  const root = useRef(null)
  const trigger = useRef(null)
  const pointer = useRef(null)
  const suppressClickUntil = useRef(0)
  const menuId = 'daymark-fab-menu'

  const toggle = () => {
    setOpen(previous=>!previous)
    feel?.('selection') // Native Pixel haptic, respects Off and OS Touch feedback
  }
  const close = (focus=false) => {
    if(open) feel?.('selection')
    setOpen(false)
    if(focus) trigger.current?.focus()
  }

  useEffect(()=>{
    if(!open)return
    const outside = event => {
      if(root.current&&!root.current.contains(event.target))close()
    }
    const key = event => {
      if(event.key==='Escape'){
        event.preventDefault()
        close(true)
      }
    }
    document.addEventListener('pointerdown',outside)
    document.addEventListener('keydown',key)
    return()=>{
      document.removeEventListener('pointerdown',outside)
      document.removeEventListener('keydown',key)
    }
  },[open,feel])

  // Menu action haptics are owned by App callbacks (new task / quick note /
  // navigation) so a single gesture never triggers duplicate pulses.
  const choose = callback => {setOpen(false);callback()}

  const start = event => {
    if(event.pointerType==='mouse'&&event.button!==0)return
    pointer.current={id:event.pointerId,x:event.clientX,y:event.clientY}
    try {event.currentTarget.setPointerCapture(event.pointerId)}
    catch { /* browser/OS may own the pointer */ }
  }
  const release = event => {
    const gesture=pointer.current
    pointer.current=null
    if(!gesture||gesture.id!==event.pointerId)return
    try{
      if(event.currentTarget.hasPointerCapture(event.pointerId))
        event.currentTarget.releasePointerCapture(event.pointerId)
    }catch { /* already released */ }
    const outcome=fabGesture(event.clientX-gesture.x,event.clientY-gesture.y)
    if(outcome==='tap')return

    // The click following a swipe must not toggle the menu again.
    suppressClickUntil.current=Date.now()+700
    if(outcome==='quick-note') choose(onQuickNote)
    else if(!open) {setOpen(true);feel?.('selection')}
  }

  const options=[
    {id:'task',title:'Add a task',Icon:ListTodo,onClick:onNewTask},
    {id:'note',title:'Add a note',Icon:NotebookPen,onClick:onQuickNote},
    {id:'shelf',title:'Open Notes',Icon:StickyNote,onClick:onNotes},
  ]
  return <div ref={root} className={'expressive-fab-root'+(open?' is-open':'')}>
    <AnimatePresence initial={false}>
      {open&&<motion.div id={menuId} className="expressive-fab-options"
        role="group" aria-label="Quick actions"
        initial={reducedMotion?false:{opacity:0,y:16,scale:.96}}
        animate={{opacity:1,y:0,scale:1}}
        exit={reducedMotion?{opacity:0}:{opacity:0,y:12,scale:.96}}
        transition={reducedMotion?{duration:0}:{...FAB_SPRING}}>
        {options.map((action,index)=><motion.button key={action.id} type="button"
          className={'expressive-fab-option'+(action.id==='note'?' is-featured':'')}
          aria-label={action.title}
          initial={reducedMotion?false:{opacity:0,y:18,scale:.86,filter:'blur(2px)'}}
          animate={{opacity:1,y:0,scale:1,filter:'blur(0px)'}}
          exit={reducedMotion?{opacity:0}:{opacity:0,y:9,scale:.90}}
          transition={reducedMotion?{duration:0}:{...FAB_ITEM_SPRING,delay:index*FAB_STAGGER_SECONDS}}
          onClick={()=>choose(action.onClick)}>
          <span className="expressive-fab-option-icon"><action.Icon size={19}/></span>
          <span className="expressive-fab-text"><strong>{action.title}</strong></span>
        </motion.button>)}
      </motion.div>}
    </AnimatePresence>
    <motion.button ref={trigger}
      className="mobile-fab v04-fab expressive-fab-trigger" type="button"
      aria-label={open?'Close quick actions':'Open quick actions; swipe left to add a note, swipe up to expand'}
      aria-expanded={open} aria-controls={open?menuId:undefined}
      whileTap={reducedMotion?undefined:{scale:.9}}
      animate={reducedMotion?{}:{borderRadius:open?'50%':'22px 30px 22px 30px'}}
      transition={reducedMotion?{duration:0}:FAB_SPRING}
      onPointerDown={start} onPointerUp={release}
      onPointerCancel={()=>{pointer.current=null}}
      onClick={()=>{
        if(Date.now()<suppressClickUntil.current)return
        toggle()
      }}>
      <motion.span animate={{rotate:open?45:0,scale:open?.9:1}}
        transition={reducedMotion?{duration:0}:FAB_SPRING}>
        <Plus size={27}/>
      </motion.span>
    </motion.button>
  </div>
}
