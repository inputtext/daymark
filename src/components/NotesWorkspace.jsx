import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { FileText, Plus, Search, Pin, PinOff, Trash2, PencilLine, Sparkles, StickyNote, Cloud, CloudOff, RefreshCw, AlertCircle } from 'lucide-react'
import { sortedNotes } from '../lib/notes.js'
import { SPRING } from '../lib/gestures.js'

export default function NotesWorkspace({notes, onNew, onOpen, onPin, onDelete, onRetry, cloudMode=false, online=true, syncState='idle', syncError='', pendingCount=0, feel, reducedMotion=false}) {
  const [search, setSearch] = useState('')
  const visible = useMemo(() => sortedNotes(notes,search),[notes,search])
  const pinnedCount = notes.filter(n=>n.pinned).length
  return <section className="notes-workspace" aria-label="Your notes">
    <header className="notes-overview">
      <div className="notes-overview-copy">
        <span className="notes-eyebrow"><Sparkles size={14}/> THOUGHTS WORTH KEEPING</span>
        <h2>A place for every little thought.</h2>
        <p>Capture ideas instantly, even offline. Signed-in notes sync with InsForge when you're connected.</p>
        <div className="notes-stats"><span><StickyNote size={15}/>{notes.length} notes</span><span><Pin size={15}/>{pinnedCount} pinned</span></div>
      </div>
      <motion.button type="button" className="notes-overview-create" whileTap={reducedMotion?undefined:{scale:.94}}
        onClick={onNew}><Plus size={18}/> Quick note</motion.button>
      <span className="notes-overview-glow" aria-hidden="true">✳</span>
    </header>
    {cloudMode&&<div className={'notes-cloud-banner'+(!online||syncState==='error'?' needs-attention':'')} role="status">
      {online ? <Cloud size={19}/> : <CloudOff size={19}/>}
      <span>{!online?'Offline · Your Notes are saved locally and will sync on reconnect.':syncState==='syncing'?'Syncing Notes with InsForge…':syncState==='error'?'Cloud sync paused · Local Notes preserved.':pendingCount?'Saved locally · '+pendingCount+' change(s) waiting to sync.':'Notes backed up to your InsForge account.'}</span>
      {(syncState==='error'||pendingCount>0)&&<button type="button" aria-label="Retry Notes sync" title="Retry Notes sync" onClick={onRetry} disabled={!online}><RefreshCw size={18}/></button>}
      {syncState==='error'&&<small title={syncError}><AlertCircle size={14}/>{syncError}</small>}
    </div>}
    <div className="notes-toolbar">
      <label className="notes-search"><Search size={19}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search your notes" aria-label="Search notes"/></label>
      <span>{visible.length} showing</span>
    </div>
    {visible.length ? <motion.div layout={!reducedMotion} className="notes-grid">
      <AnimatePresence initial={false}>
        {visible.map((note,index)=><motion.article layout={!reducedMotion} key={note.id}
          className={'note-card'+(note.pinned?' is-pinned':'')}
          initial={reducedMotion?false:{opacity:0,y:16,scale:.96}}
          animate={{opacity:1,y:0,scale:1}} exit={reducedMotion?{opacity:0}:{opacity:0,scale:.94}}
          transition={reducedMotion?{duration:0}:{...SPRING,delay:Math.min(index*.025,.13)}}>
          <button type="button" className="note-card-main" onClick={()=>onOpen(note)}
            aria-label={'Edit note: '+(note.title||note.body.slice(0,40)||'Untitled note')}>
            <span className="note-card-stamp"><FileText size={17}/>{note.pinned&&<Pin size={13}/>}</span>
            <strong>{note.title.trim()||'Untitled note'}</strong>
            <p>{note.body.trim()||'Add details to this note.'}</p>
            <time dateTime={note.updated_at}>{new Date(note.updated_at).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})}</time>
          </button>
          <div className="note-card-actions">
            <button type="button" aria-label={(note.pinned?'Unpin ':'Pin ')+(note.title||'note')}
              onClick={()=>onPin(note.id)}>{note.pinned?<PinOff size={17}/>:<Pin size={17}/>}</button>
            <button type="button" aria-label={'Delete '+(note.title||'note')} onClick={()=>onDelete(note)}><Trash2 size={17}/></button>
          </div>
        </motion.article>)}
      </AnimatePresence>
    </motion.div> : <div className="notes-empty"><span><PencilLine size={30}/></span><h3>{search?'No matching notes':'Your next idea starts here.'}</h3><p>{search?'Try a different search term.':'Tap Quick note or swipe left on the floating + button to capture a thought instantly.'}</p>{!search&&<button type="button" onClick={onNew}><Plus size={17}/> Write a note</button>}</div>}
    <p className="notes-local-footnote">{cloudMode?'Offline-first · Local copy + InsForge cloud backup after sync · Do not clear app data while changes are pending':'Demo Notes · Saved only on this device · Sign in for cloud backup'}</p>
  </section>
}
