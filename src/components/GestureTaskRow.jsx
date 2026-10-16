import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence, animate, useMotionValue, useReducedMotion } from 'motion/react'
import { CalendarDays, Check, Pencil, Trash2, MoreHorizontal, CalendarClock, X } from 'lucide-react'
import { decideSwipe, shouldCancelLongPress, LONG_PRESS_MS, SPRING } from '../lib/gestures.js'

/**
 * GPU-friendly, touch-first task interactions.
 * Right swipe => complete/reopen (reversible).
 * Left swipe => explicit Edit/Delete buttons; never delete by swiping.
 * Long press, right-click, More or keyboard Enter => context menu.
 */
export default function GestureTaskRow({
  task, due, overdue, today, tomorrow,
  onToggle, onEdit, onDelete, onReschedule, feel, reducedMotion = false, index = 0,
}) {
  const systemReducedMotion = useReducedMotion()
  const quiet = Boolean(reducedMotion || systemReducedMotion)
  const x = useMotionValue(0)
  const [revealed, setRevealed] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuAbove, setMenuAbove] = useState(false)
  const [busy, setBusy] = useState(false)
  const rowRef = useRef(null)
  const menuRef = useRef(null)
  const holdTimer = useRef(null)
  const pointerStart = useRef(null)
  const crossed = useRef(false)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      clearTimeout(holdTimer.current)
    }
  }, [])

  const stopHold = () => {
    if (holdTimer.current !== null) clearTimeout(holdTimer.current)
    holdTimer.current = null
    pointerStart.current = null
  }
  const snap = target => {
    if (quiet) x.set(target)
    else animate(x, target, SPRING)
  }
  const closeActions = () => {
    setRevealed(false)
    setMenuOpen(false)
    snap(0)
  }
  const openMenu = () => {
    if (busy) return
    stopHold()
    const bounds = rowRef.current?.getBoundingClientRect()
    const visibleHeight = window.visualViewport?.height || window.innerHeight
    setMenuAbove(Boolean(bounds && visibleHeight - bounds.bottom < 330))
    setRevealed(false)
    snap(0)
    setMenuOpen(true)
    feel('action')
  }
  useEffect(() => {
    if (!menuOpen) return
    const frame = requestAnimationFrame(() => menuRef.current?.querySelector('button')?.focus())
    const onKey = event => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setMenuOpen(false)
        rowRef.current?.focus()
      }
    }
    const onOutside = event => {
      if (rowRef.current && !rowRef.current.contains(event.target)) setMenuOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onOutside)
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onOutside)
    }
  }, [menuOpen])

  // Dismiss revealed swipe actions when the user moves to another task.
  // No destructive operation is performed by this dismissal.
  useEffect(() => {
    if (!revealed) return
    const closeOnOutside = event => {
      if (!rowRef.current?.contains(event.target)) {
        setRevealed(false)
        if (quiet) x.set(0)
        else animate(x, 0, SPRING)
      }
    }
    document.addEventListener('pointerdown', closeOnOutside)
    return () => document.removeEventListener('pointerdown', closeOnOutside)
  }, [revealed, quiet, x])

  const run = async action => {
    if (busy) return
    stopHold()
    closeActions()
    setBusy(true)
    try { await action(task) }
    finally { if (mounted.current) setBusy(false) }
  }

  const beginHold = event => {
    if (busy || menuOpen) return
    if (event.pointerType === 'mouse' && event.button !== 0) return
    if (event.target.closest('button,a,input,textarea,select,[role="menu"]')) return
    stopHold()
    pointerStart.current = { id: event.pointerId, x: event.clientX, y: event.clientY }
    holdTimer.current = setTimeout(() => {
      if (pointerStart.current) openMenu()
    }, LONG_PRESS_MS)
  }
  const trackHold = event => {
    const p = pointerStart.current
    if (p && p.id === event.pointerId && shouldCancelLongPress(event.clientX - p.x, event.clientY - p.y)) stopHold()
  }
  const onDragStart = () => {
    stopHold()
    crossed.current = false
    setMenuOpen(false)
  }
  const onDrag = () => {
    const current = x.get()
    // A confirmed completion produces its own native haptic. Only tick when
    // revealing actions, otherwise a quick swipe could double-vibrate.
    const beyond = current <= -72
    if (beyond && !crossed.current) {
      // At most one crisp selection tick per drag, even if the finger jitters.
      crossed.current = true
      feel('selection')
    }
  }
  const onDragEnd = (_event, info) => {
    stopHold()
    const result = decideSwipe(x.get(), info.velocity.x)
    if (result === 'complete') {
      setRevealed(false)
      snap(0)
      void run(onToggle)
    } else if (result === 'reveal') {
      setRevealed(true)
      snap(-98)
    } else {
      setRevealed(false)
      snap(0)
    }
  }

  const rowClass = 'task-row gesture-task-row' + (task.is_complete ? ' task-done' : '') + (menuOpen ? ' gesture-menu-open' : '')
  return <motion.article
    ref={rowRef}
    layout={quiet ? false : 'position'}
    initial={quiet ? false : { opacity: 0, y: 14, scale: .985 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={quiet ? { opacity: 0, transition: { duration: .1 } } : { opacity: 0, x: 28, scale: .975, transition: { duration: .18 } }}
    transition={quiet ? { duration: 0 } : { ...SPRING, delay: Math.min(index * .025, .14) }}
    tabIndex={0}
    className={rowClass}
    aria-label={task.title + '. ' + (task.is_complete ? 'Completed' : 'Not completed') + '. Swipe right to toggle, swipe left for actions, or press Enter for menu.'}
    onKeyDown={event => {
      if (event.target === rowRef.current && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault()
        openMenu()
      }
    }}
    onContextMenu={event => { event.preventDefault(); openMenu() }}
  >
    <div className="gesture-underlay" aria-hidden="true">
      <span className="gesture-underlay-done"><Check size={22} strokeWidth={3}/>{task.is_complete ? 'Reopen' : 'Complete'}</span>
      <span className="gesture-underlay-edit"><Pencil size={18}/>Quick actions</span>
    </div>
    <div className={'gesture-reveal-buttons' + (revealed ? ' is-visible' : '')} aria-hidden={!revealed}>
      <button type="button" tabIndex={revealed ? 0 : -1} disabled={busy} title="Edit task" aria-label={'Edit ' + task.title} onClick={() => void run(onEdit)}><Pencil size={17}/></button>
      <button type="button" tabIndex={revealed ? 0 : -1} disabled={busy} title="Delete task" aria-label={'Delete ' + task.title} onClick={() => void run(onDelete)}><Trash2 size={17}/></button>
    </div>
    <motion.div
      className="gesture-task-surface"
      style={{ x }}
      drag={busy || menuOpen ? false : 'x'}
      dragConstraints={{ left: -112, right: 118 }}
      dragElastic={.12}
      dragMomentum={false}
      whileDrag={quiet ? undefined : { scale: .988 }}
      onDragStart={onDragStart}
      onDrag={onDrag}
      onDragEnd={onDragEnd}
      onPointerDown={beginHold}
      onPointerMove={trackHold}
      onPointerUp={stopHold}
      onPointerCancel={stopHold}
      onPointerLeave={event => { if (event.pointerType === 'mouse') stopHold() }}
    >
      <motion.button
        type="button"
        title={task.is_complete ? 'Mark incomplete' : 'Mark complete'}
        aria-label={(task.is_complete ? 'Mark incomplete' : 'Complete') + ': ' + task.title}
        className={'task-toggle' + (task.is_complete ? ' is-checked' : '')}
        disabled={busy}
        whileTap={quiet ? undefined : { scale: .82 }}
        onClick={() => void run(onToggle)}
      >
        <AnimatePresence initial={false}>
          {task.is_complete && <motion.span key="check" initial={quiet ? false : { scale: .4, rotate: -35, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} exit={{ scale: .5, opacity: 0 }} transition={SPRING}><Check size={17} strokeWidth={3}/></motion.span>}
        </AnimatePresence>
      </motion.button>
      <div className="task-main"><span className="task-name">{task.title}</span>{task.notes && <p className="task-notes">{task.notes}</p>}</div>
      <div className="task-labels"><span className={'priority-badge priority-' + task.priority}><span className="badge-circle"/>{task.priority}</span>{due && <span className={'due-badge' + (overdue ? ' due-overdue' : '')}><CalendarDays size={13}/>{due}</span>}</div>
      <div className="task-actions">
        <button type="button" title="Edit" aria-label={'Edit ' + task.title} onClick={() => void run(onEdit)} disabled={busy}><Pencil size={16}/></button>
        <button type="button" title="More actions" aria-label={'More actions for ' + task.title} aria-expanded={menuOpen} onClick={() => menuOpen ? closeActions() : openMenu()} disabled={busy}><MoreHorizontal size={19}/></button>
      </div>
    </motion.div>
    <AnimatePresence>
      {menuOpen && <motion.div
        key="context"
        ref={menuRef}
        className={"gesture-context-menu" + (menuAbove ? " gesture-menu-above" : "")}
        role="menu"
        aria-label={'Actions for ' + task.title}
        initial={quiet ? false : { opacity: 0, y: -10, scale: .93 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -7, scale: .96 }}
        transition={quiet ? { duration: .08 } : SPRING}
      >
        <div className="gesture-menu-title">{task.title}</div>
        <button type="button" role="menuitem" onClick={() => void run(onToggle)}><Check size={17}/>{task.is_complete ? 'Reopen task' : 'Complete task'}</button>
        <button type="button" role="menuitem" onClick={() => void run(onEdit)}><Pencil size={17}/>Edit task</button>
        <button type="button" role="menuitem" onClick={() => void run(t => onReschedule(t, today))}><CalendarClock size={17}/>Move to today</button>
        <button type="button" role="menuitem" onClick={() => void run(t => onReschedule(t, tomorrow))}><CalendarDays size={17}/>Move to tomorrow</button>
        <button type="button" role="menuitem" className="gesture-delete-menu" onClick={() => void run(onDelete)}><Trash2 size={17}/>Delete…</button>
        <button type="button" role="menuitem" className="gesture-close-menu" onClick={closeActions}><X size={15}/>Close menu</button>
      </motion.div>}
    </AnimatePresence>
  </motion.article>
}
