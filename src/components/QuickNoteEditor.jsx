import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'motion/react'
import { Check, FileText, Pin, PinOff, X } from 'lucide-react'
import { NOTE_TITLE_LIMIT, NOTE_BODY_LIMIT } from '../lib/notes.js'
import { SPRING } from '../lib/gestures.js'

/** Small, thumb-reachable quick-capture sheet; keystrokes save immediately. */
export default function QuickNoteEditor({note,onChange,onClose,onPin,feel,reducedMotion=false}) {
  const bodyRef = useRef(null)
  const sheetRef = useRef(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  useEffect(()=>{
    const focus = requestAnimationFrame(()=>bodyRef.current?.focus())
    const onKey = e => {
      if (e.key==='Escape') {e.preventDefault();e.stopPropagation();closeRef.current();return}
      if (e.key!=='Tab')return
      const nodes=[...sheetRef.current?.querySelectorAll('button:not(:disabled),input:not(:disabled),textarea:not(:disabled)')||[]]
      if (!nodes.length)return
      if (e.shiftKey&&document.activeElement===nodes[0]){e.preventDefault();nodes.at(-1).focus()}
      else if (!e.shiftKey&&document.activeElement===nodes.at(-1)){e.preventDefault();nodes[0].focus()}
    }
    document.addEventListener('keydown',onKey,true)
    return()=>{cancelAnimationFrame(focus);document.removeEventListener('keydown',onKey,true)}
  },[])
  return createPortal(<motion.div className="note-editor-shade"
    initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:reducedMotion?0:.19}}
    onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}>
    <motion.section ref={sheetRef} className="note-editor-sheet" role="dialog" aria-modal="true" aria-label="Quick note"
      initial={reducedMotion?false:{y:100,scale:.94,opacity:.75}} animate={{y:0,scale:1,opacity:1}}
      exit={reducedMotion?{opacity:0}:{y:90,scale:.95,opacity:0}} transition={reducedMotion?{duration:0}:SPRING}>
      <div className="note-editor-handle" aria-hidden="true"/>
      <div className="note-editor-top"><span><FileText size={18}/> QUICK NOTE</span>
        <div><button type="button" aria-label={note.pinned?'Unpin note':'Pin note'}
          title={note.pinned?'Unpin':'Pin'} onClick={()=>{onPin();feel?.('selection')}}>{note.pinned?<PinOff size={20}/>:<Pin size={20}/>}</button>
          <button type="button" aria-label="Close note" onClick={onClose}><X size={20}/></button></div>
      </div>
      <input className="note-editor-title" value={note.title} maxLength={NOTE_TITLE_LIMIT} aria-label="Note title"
        placeholder="Untitled thought..." onChange={e=>onChange({...note,title:e.target.value})}/>
      <textarea ref={bodyRef} className="note-editor-body" value={note.body} maxLength={NOTE_BODY_LIMIT}
        aria-label="Note content" placeholder="What's on your mind? Start typing…" rows={8}
        onChange={e=>onChange({...note,body:e.target.value})}/>
      <div className="note-editor-foot">
        <span><Check size={15}/> Saved automatically on this device</span>
        <button className="note-editor-done" type="button" onClick={()=>{feel?.('action');onClose()}}>Done <Check size={18}/></button>
      </div>
    </motion.section>
  </motion.div>,document.body)
}
