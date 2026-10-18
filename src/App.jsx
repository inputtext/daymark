import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowRight, ArrowUpRight, CalendarDays, Check, CheckCheck, CheckCircle2,
  ChevronDown, Circle, Clock3, Command, Fingerprint, Wifi, WifiOff, Inbox, Keyboard, LayoutGrid, ListFilter,
  LoaderCircle, LockKeyhole, LogOut, Mail, Moon, MoreHorizontal, Pencil,
  Plus, Search, ShieldCheck, Sparkles, StickyNote, Sun, Trash2, X,
} from 'lucide-react'
import { insforge, INSFORGE_CONFIGURED } from './lib/insforge.js'
import { createDemoTasks, dateISO, filterTasks, getDueLabel, getStats, shiftDate } from './lib/tasks.js'
import { parseSmartTask } from './lib/smartTask.js'
import { hapticFeedback, normalizeHapticLevel } from './lib/haptics.js'
import { Capacitor, SystemBars, SystemBarsStyle } from '@capacitor/core'
import { App as NativeApp } from '@capacitor/app'
import Onboarding, { hasSeenOnboarding, markOnboardingSeen } from './components/Onboarding.jsx'
import { Network } from '@capacitor/network'
import { queueNoteChanges, syncCloudNotes, readNotesOutbox } from './lib/cloudNotes.js'
import { biometricLockEnabled, setBiometricLockEnabled, checkBiometricAvailability, verifyBiometricLock, isNativeBiometricDevice } from './lib/biometricLock.js'
import { motion, MotionConfig, AnimatePresence, LayoutGroup } from 'motion/react'
import GestureTaskRow from './components/GestureTaskRow.jsx'
import ExpressiveLoading from './components/ExpressiveLoading.jsx'
const NotesWorkspace = lazy(() => import('./components/NotesWorkspace.jsx'))
import QuickNoteEditor from './components/QuickNoteEditor.jsx'
import ExpressiveFabMenu from './components/ExpressiveFabMenu.jsx'
import {notesStorageKey,readNotes,writeNotes,newDraft,saveDraft,togglePinned,deleteNote} from './lib/notes.js'
const ExpressiveCalendar = lazy(() => import('./components/ExpressiveCalendar.jsx'))
import { ExpressiveDatePicker, ExpressiveTimePicker } from './components/ExpressivePickers.jsx'
import { localISO } from './lib/calendar.js'
const IslandSettings = lazy(() => import('./components/IslandSettings.jsx'))
import {scheduleTaskReminder, cancelTaskReminder, syncIslandHaptics, isAndroidIslandSupported, calendarReminderScheduled, cancelCalendarReminder, syncCalendarReminder, calendarReminderAt} from './lib/island.js'
import { SPRING } from './lib/gestures.js'

const STORAGE = 'daymark:demo-tasks:v1'
const cloudTaskCacheKey = userId => userId ? 'daymark:tasks:v08:cache:'+userId : null
const cachedCloudTasks = userId => {try {const data=JSON.parse(localStorage.getItem(cloudTaskCacheKey(userId))||'[]');return Array.isArray(data)?data:[]}catch{return []}}
const saveTaskCache = (userId,items) => {try {if(userId)localStorage.setItem(cloudTaskCacheKey(userId),JSON.stringify(items))}catch{/* optional task cache */}}
const THEME = 'daymark:theme'
const NAV = [
  { id: 'inbox', label: 'All tasks', icon: LayoutGrid },
  { id: 'today', label: 'Today', icon: Sun },
  { id: 'upcoming', label: 'Upcoming', icon: CalendarDays },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'notes', label: 'Notes', icon: StickyNote },
  { id: 'completed', label: 'Completed', icon: CheckCircle2 },
]
const TITLES = {
  inbox: ['Your workspace', 'Everything you need to do, all in one place.'],
  today: ['Today’s focus', 'Small steps add up to big things.'],
  upcoming: ['On the horizon', 'Stay one step ahead of what’s next.'],
  calendar: ['Your calendar', 'A clearer view of what comes next.'],
  notes: ['Your notes', 'Save a thought before it slips away.'],
  completed: ['The done list', 'A little proof of all your progress.'],
}

function Logo({ light = false }) {
  return <div className={`brand ${light ? 'brand-light' : ''}`}>
    <div className="brand-mark"><Check strokeWidth={3.3} size={19} /></div>
    <span>daymark<span className="brand-dot">.</span></span>
  </div>
}

function getDemo() {
  try {
    const raw = localStorage.getItem(STORAGE)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed
    }
  } catch { /* use defaults on invalid stored data */ }
  const seed = createDemoTasks()
  localStorage.setItem(STORAGE, JSON.stringify(seed))
  return seed
}

function AuthScreen({ onDemo, onAuth, onShowIntro, notify }) {
  const [tab, setTab] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [otp, setOtp] = useState('')
  const [verification, setVerification] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event) => {
    event.preventDefault()
    if (!insforge) return
    setBusy(true); setError('')
    try {
      if (verification) {
        const { data, error: authError } = await insforge.auth.verifyEmail({ email, otp })
        if (authError) throw authError
        if (data?.user) onAuth(data.user)
      } else if (tab === 'signup') {
        const { data, error: authError } = await insforge.auth.signUp({
          name: name.trim(), email: email.trim(), password,
          redirectTo: `${location.origin}/`,
        })
        if (authError) throw authError
        if (data?.requireEmailVerification) {
          setVerification(true)
          notify('Check your email for the verification code or link.')
        } else if (data?.user) onAuth(data.user)
        else { setTab('signin'); notify('Account created. Please sign in.') }
      } else {
        const { data, error: authError } = await insforge.auth.signInWithPassword({ email: email.trim(), password })
        if (authError) throw authError
        if (data?.user) onAuth(data.user)
      }
    } catch (e) { setError(e?.message || 'Something went wrong. Please try again.') }
    finally { setBusy(false) }
  }

  return <div className="welcome-shell dm-auth-compact">
    <div className="welcome-art">
      <div className="welcome-art-header"><Logo light /><span className="art-pill"><span className="pulse-dot" /> Your calm productivity space</span></div>
      <div className="art-center">
        <div className="orbit orbit-one" /><div className="orbit orbit-two" />
        <div className="art-todo-card">
          <div className="art-card-top"><span className="art-card-avatar">✦</span> <span>Today’s priorities</span><MoreHorizontal size={19} /></div>
          <div className="art-sample"><span className="art-check checked"><Check size={14}/></span><span className="art-strike">Make a fresh start</span><span className="sample-time">9:00</span></div>
          <div className="art-sample"><span className="art-check checked"><Check size={14}/></span><span className="art-strike">Find your focus</span><span className="sample-time">10:30</span></div>
          <div className="art-sample"><span className="art-check"/><span>Make something great</span><span className="sample-time">12:00</span></div>
          <div className="art-card-foot"><div className="art-progress"><span/></div> 2 of 3 completed</div>
        </div>
        <div className="floating-stamp">✳ <span>One thing at a time.</span></div>
      </div>
      <div className="art-bottom"><h1>Less busy.<br/><em>More done.</em></h1><p>Bring a little clarity to your everyday, and make room for what matters.</p></div>
      <div className="art-copyright">A little progress, every day. © {new Date().getFullYear()} Daymark</div>
    </div>
    <div className="welcome-panel">
      <div className="welcome-mobile-logo"><Logo /></div>
      <div className="auth-content">
        <h2>{verification ? 'Verify your email' : tab === 'signup' ? 'Create your space' : 'Welcome back.'}</h2>
        {verification && <p className="auth-subtitle">Enter the code sent to {email}, or use the link in your inbox.</p>}
        {INSFORGE_CONFIGURED ? <>
          {!verification && <div className="auth-tabs" role="tablist" aria-label="Account action">
            <button className={tab === 'signin' ? 'active' : ''} type="button" onClick={() => {setTab('signin');setError('')}}>Sign in</button>
            <button className={tab === 'signup' ? 'active' : ''} type="button" onClick={() => {setTab('signup');setError('')}}>Create account</button>
          </div>}
          <form className="auth-form" onSubmit={submit}>
            {!verification && tab === 'signup' && <label>Your name <div className="input-wrap"><Circle size={17}/><input autoComplete="name" placeholder="How should we call you?" required value={name} onChange={e=>setName(e.target.value)}/></div></label>}
            {verification ? <label>Verification code <div className="input-wrap"><LockKeyhole size={17}/><input required minLength={6} maxLength={6} inputMode="numeric" placeholder="6-digit code" value={otp} onChange={e=>setOtp(e.target.value)}/></div></label> : <>
              <label>Email address <div className="input-wrap"><Mail size={17}/><input type="email" autoComplete="email" required placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)}/></div></label>
              <label>Password <div className="input-wrap"><LockKeyhole size={17}/><input type="password" autoComplete={tab==='signup'?'new-password':'current-password'} minLength={8} required placeholder="At least 8 characters" value={password} onChange={e=>setPassword(e.target.value)}/></div></label>
            </>}
            {error && <p className="form-error" role="alert">{error}</p>}
            <button type="submit" className="button-primary auth-submit" disabled={busy}>{busy ? <LoaderCircle className="spin" size={18}/> : null}{verification ? 'Verify email' : tab === 'signup' ? 'Create account' : 'Sign in'} <ArrowRight size={18}/></button>
            {verification && <button className="text-button" type="button" onClick={()=>{setVerification(false);setTab('signin')}}>Back to sign in</button>}
          </form>
        </> : <div className="demo-note"><ShieldCheck size={18}/><span>Preview mode is ready. Connect InsForge to enable secure accounts and cloud sync.</span></div>}
        {!verification && <div className="dm-auth-alternatives">
          <button type="button" className="button-demo" onClick={onDemo}><Sparkles size={18}/> Explore demo <ArrowUpRight size={17}/></button>
          <button type="button" className="dm-ob-replay" onClick={onShowIntro}>View intro <ArrowRight size={15}/></button>
        </div>}
      </div>
      <span className="welcome-bottom-right" aria-hidden="true">Build better days, gently. ✦</span>
    </div>
  </div>
}

function TaskModal({ task, initialDue, onClose, onSave, onDelete, busy, reducedMotion, feel }) {
  const [title, setTitle] = useState(task?.title || '')
  const [notes, setNotes] = useState(task?.notes || '')
  const [dueDate, setDueDate] = useState(task?.due_date || initialDue || '')
  const [dueTime, setDueTime] = useState(task?.due_time || '')
  const [priority, setPriority] = useState(task?.priority || 'medium')
  const [remindAtTime,setRemindAtTime] = useState(!task && isAndroidIslandSupported())
  const [checkingReminder,setCheckingReminder] = useState(Boolean(task && isAndroidIslandSupported()))
  useEffect(()=>{
    if(!task?.id || !isAndroidIslandSupported()) return
    let alive=true
    calendarReminderScheduled(task.id)
      .then(result=>{if(alive)setRemindAtTime(result)})
      .catch(()=>{if(alive)setRemindAtTime(false)})
      .finally(()=>{if(alive)setCheckingReminder(false)})
    return ()=>{alive=false}
  },[task?.id])
  const smart = useMemo(() => task ? null : parseSmartTask(title), [task, title])
  const applySuggestions = () => {
    if (!smart?.hasSuggestions) return
    setTitle(smart.title)
    if (smart.due_date) setDueDate(smart.due_date)
    if (smart.priority) setPriority(smart.priority)
  }
  const titleRef = useRef(null)
  useEffect(() => {
    titleRef.current?.focus()
    const handle = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [onClose])
  const save = e => {
    e.preventDefault()
    const clean = title.trim()
    if (!clean) return
    onSave({ title: clean, notes: notes.trim(), due_date: dueDate || null, due_time: dueDate && dueTime ? dueTime : null, priority, remind_at_time: Boolean(dueDate && dueTime && remindAtTime) })
  }
  return <motion.div className="modal-shade v04-modal-shade" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:reducedMotion?0:.18}} onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}>
    <motion.section className="modal v04-modal" role="dialog" aria-modal="true" aria-labelledby="task-modal-title" initial={reducedMotion?false:{opacity:0,y:46,scale:.96}} animate={{opacity:1,y:0,scale:1}} exit={reducedMotion?{opacity:0}:{opacity:0,y:30,scale:.97}} transition={reducedMotion?{duration:0}:{type:"spring",stiffness:430,damping:35,mass:.95}}>
      <div className="modal-head"><div><span className="modal-kicker">YOUR TO-DO LIST</span><h2 id="task-modal-title">{task ? 'Edit task' : 'Create a task'}</h2></div><button className="icon-button" aria-label="Close" onClick={onClose}><X size={21}/></button></div>
      <form onSubmit={save} className="task-form">
        <label>Task name <input ref={titleRef} className="form-input" maxLength={240} required placeholder="Try: Review notes tomorrow !high" value={title} onChange={e=>setTitle(e.target.value)}/></label>
        {!task && <p className="smart-entry-hint"><Sparkles size={14} aria-hidden="true"/> Offline smart entry: today, tomorrow, next week, in 3 days, !high / !medium / !low</p>}
        {smart?.hasSuggestions && <div className="smart-entry-preview" role="status"><div className="smart-entry-copy"><strong><Sparkles size={14} aria-hidden="true"/> Smart suggestions</strong><span>{[smart.due_date && `Due ${smart.due_date}`, smart.priority && `${smart.priority} priority`].filter(Boolean).join(' · ')}</span></div><button type="button" onClick={applySuggestions} aria-label="Apply suggested date and priority">Apply</button></div>}
        <label>Notes <textarea className="form-input" maxLength={4000} rows={3} placeholder="Add a little context (optional)" value={notes} onChange={e=>setNotes(e.target.value)}/></label>
        <div className="form-cols"><div className="calendar-modal-field"><span>Due date</span><ExpressiveDatePicker value={dueDate} onChange={day => {setDueDate(day);if(!day)setDueTime('')}} feel={feel} lessMotion={reducedMotion}/></div><div className="calendar-modal-field"><span>Time (optional)</span><ExpressiveTimePicker value={dueTime} onChange={setDueTime} feel={feel} lessMotion={reducedMotion} disabled={!dueDate}/>{!dueDate&&<small className="calendar-time-help">Choose a date to enable a time.</small>}</div></div>
        <label>Priority <select className="form-input" value={priority} onChange={e=>setPriority(e.target.value)}><option value="low">Low priority</option><option value="medium">Medium priority</option><option value="high">High priority</option></select></label>
        {isAndroidIslandSupported()&&<label className="calendar-native-remind">
          <input type="checkbox" checked={remindAtTime} disabled={!dueDate||!dueTime||checkingReminder||busy}
            onChange={e=>{setRemindAtTime(e.target.checked);feel?.('selection')}}/>
          <span><strong>Remind me at this time</strong>
          <small>{checkingReminder?'Checking saved reminder…':!dueDate||!dueTime?'Choose a date and time first':'Local Android notification · Approximate delivery · No Island permission needed'}</small></span>
        </label>}
        <div className="modal-actions">
          {task&&<button type="button" className="task-modal-delete" disabled={busy}
            aria-label={'Delete task '+task.title} onClick={()=>void onDelete(task)}>
            <Trash2 size={17}/> Delete task
          </button>}
          <button type="button" className="button-cancel" disabled={busy} onClick={onClose}>Cancel</button>
          <button className="button-primary" type="submit" disabled={busy||checkingReminder}>{busy ? <LoaderCircle size={17} className="spin"/> : <Plus size={17}/>} {task ? 'Save changes' : 'Add task'}</button>
        </div>
      </form>
    </motion.section>
  </motion.div>
}

function App() {
  const [session, setSession] = useState('loading') // loading | guest | demo | cloud
  const [onboardingComplete,setOnboardingComplete]=useState(()=>hasSeenOnboarding(localStorage))
  const [user, setUser] = useState(null)
  const [tasks, setTasks] = useState([])
  const [view, setView] = useState('inbox')
  const [selectedCalendarDate,setSelectedCalendarDate] = useState(()=>localISO(new Date()))
  const cloudTimeSupported = useRef(true)
  const [query, setQuery] = useState('')
  const [priority, setPriority] = useState('all')
  const [sort, setSort] = useState('smart')
  const [modal, setModal] = useState(null) // null | {task?, due?}
  const [notes,setNotes] = useState([])
  const [noteEditor,setNoteEditor] = useState(null)
  const [busy, setBusy] = useState(false)
  const [loadingTasks, setLoadingTasks] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [toast, setToast] = useState('')
  const [online,setOnline] = useState(()=>navigator.onLine)
  const [resumeSignal,setResumeSignal] = useState(0)
  const [noteSyncSignal,setNoteSyncSignal] = useState(0)
  const [noteSyncState,setNoteSyncState] = useState('idle')
  const [noteSyncError,setNoteSyncError] = useState('')
  const notesSyncPromise=useRef(null)
  const notesSyncQueued=useRef(false)
  const activeSyncScope=useRef(null)
  const authPromptActive=useRef(false)
  const [unlockGranted,setUnlockGranted]=useState(false)
  const [lockError,setLockError]=useState('')
  const [biometricBusy,setBiometricBusy]=useState(false)
  const [,setLockEpoch]=useState(0)
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME) || 'light')
  const [palette, setPalette] = useState(() => {
    try { return ['iris','lagoon','citrus','rose'].includes(localStorage.getItem('daymark:palette')) ? localStorage.getItem('daymark:palette') : 'iris' }
    catch { return 'iris' }
  })
  const [lessMotion, setLessMotion] = useState(() => {
    try { return localStorage.getItem('daymark:less-motion') === 'true' }
    catch { return false }
  })
  const [appearanceOpen, setAppearanceOpen] = useState(false)
  const [hapticLevel, setHapticLevel] = useState(() => {
    try { return normalizeHapticLevel(localStorage.getItem('daymark:haptics')) }
    catch { return 'balanced' }
  })
  const feel = useCallback((kind, level = hapticLevel) => {
    void hapticFeedback(kind, level)
  }, [hapticLevel])
  const searchRef = useRef(null)
  const today = dateISO()
  const notify = useCallback(message => setToast(message), [])
  // Preserve existing local Notes as a per-user offline copy.
  // The outbox uploads explicitly changed notes and soft-delete tombstones.
  const noteScope = notesStorageKey(session, user?.id)
  activeSyncScope.current=noteScope
  useEffect(() => {
    setNotes(readNotes(localStorage,noteScope))
    setNoteEditor(null)
    setNoteSyncState('idle')
    setNoteSyncError('')
  },[noteScope])
  const mutateNotes = useCallback(transform => {
    try {
      const previous=readNotes(localStorage,noteScope)
      const next=transform(previous)
      writeNotes(localStorage,noteScope,next)
      if(session==='cloud') {
        queueNoteChanges(localStorage,noteScope,previous,next)
        setNoteSyncState('pending')
        setNoteSyncSignal(value=>value+1)
      }
      setNotes(next)
      return true
    } catch(error) {
      notify('Could not save note: '+(error?.message||'Local storage unavailable'))
      return false
    }
  },[noteScope,notify,session])
  const openQuickNote = () => {
    setNoteEditor(newDraft(crypto.randomUUID()))
    setSidebarOpen(false)
    setAppearanceOpen(false)
    feel('action')
  }
  const editNote = note => {
    setNoteEditor({...note})
    setSidebarOpen(false)
    feel('selection')
  }
  const updateNote = draft => {
    if(mutateNotes(items=>saveDraft(items,draft)))setNoteEditor(draft)
  }
  const pinNote = id => {
    if(mutateNotes(items=>togglePinned(items,id)))feel('selection')
  }
  const deleteSavedNote = note => {
    if(!window.confirm('Delete this note? This cannot be undone.'))return
    if(mutateNotes(items=>deleteNote(items,note.id))) {
      setNoteEditor(editor=>editor?.id===note.id?null:editor)
      feel('warning')
      notify('Note deleted')
    }
  }


  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem(THEME, theme)
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#15131d' : '#f5f3fa')
    if (Capacitor.isNativePlatform()) {
      // Keep system bar icon contrast consistent with Daymark's theme.
      void SystemBars.setStyle({style: theme === 'dark' ? SystemBarsStyle.Dark : SystemBarsStyle.Light}).catch(() => {})
    }
  }, [theme])
  useEffect(() => {
    document.documentElement.dataset.palette = palette
    try { localStorage.setItem('daymark:palette',palette) } catch { /* private browsing */ }
  }, [palette])
  useEffect(() => {
    try { localStorage.setItem('daymark:haptics', hapticLevel) } catch { /* storage disabled */ }
    // The island can run after the WebView closes. Keep its native setting in
    // sync so Daymark's Off/Subtle/Balanced/Strong also apply to overlay taps.
    void syncIslandHaptics(hapticLevel).catch(() => {})
  }, [hapticLevel])
  useEffect(() => {
    document.documentElement.dataset.lessMotion = String(lessMotion)
    try { localStorage.setItem('daymark:less-motion',String(lessMotion)) } catch { /* private browsing */ }
  }, [lessMotion])
  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(''), 3500)
    return () => clearTimeout(id)
  }, [toast])
  useEffect(() => {
    let alive = true
    if (!insforge) { setSession('guest'); return }
    insforge.auth.getCurrentUser().then(({data, error}) => {
      if (!alive) return
      if (!error && data?.user) {markOnboardingSeen(localStorage);setOnboardingComplete(true);setUser(data.user);setSession('cloud')}
      else setSession('guest')
    }).catch(() => {if (alive) setSession('guest')})
    return () => {alive = false}
  }, [])

  const refresh = useCallback(async () => {
    if (!insforge || !user?.id || !online) return
    setLoadingTasks(true)
    try {
      let response = await insforge.database.from('tasks')
        .select('id,user_id,title,notes,due_date,due_time,priority,is_complete,created_at,updated_at')
        .order('created_at', {ascending:false})
      if (response.error && /due_time|column.*not.*exist|schema cache/i.test(response.error.message||'')) {
        cloudTimeSupported.current = false
        response = await insforge.database.from('tasks')
          .select('id,user_id,title,notes,due_date,priority,is_complete,created_at,updated_at')
          .order('created_at', {ascending:false})
      } else if (!response.error) cloudTimeSupported.current = true
      if(response.error)throw response.error
      const items=response.data||[]
      // Do not mix task caches between different signed-in users.
      if(activeSyncScope.current===notesStorageKey('cloud',user.id)){
        setTasks(items)
        saveTaskCache(user.id,items)
      }
    } catch(error) {
      notify(error?.message||'Could not refresh tasks. Showing saved copy.')
    } finally {setLoadingTasks(false)}
  }, [notify,user?.id,online])
  useEffect(()=>{
    if(session==='cloud'&&user?.id)setTasks(cachedCloudTasks(user.id))
  },[session,user?.id])
  useEffect(()=>{if(session==='cloud'&&user?.id&&online)void refresh()},[session,user?.id,online,resumeSignal,refresh])

  const syncNotesNow=useCallback(async()=>{
    if(session!=='cloud'||!user?.id||!insforge||!online||!noteScope)return
    if(notesSyncPromise.current){notesSyncQueued.current=true;return}
    const scope=noteScope
    setNoteSyncState('syncing')
    const promise=syncCloudNotes({storage:localStorage,scope,userId:user.id,client:insforge})
    notesSyncPromise.current=promise
    try{
      const result=await promise
      if(activeSyncScope.current!==scope)return
      setNotes(previous=>JSON.stringify(previous)===JSON.stringify(result.notes)?previous:result.notes)
      setNoteSyncState(result.pending?'pending':'synced')
      setNoteSyncError('')
    }catch(error){
      if(activeSyncScope.current===scope){
        setNoteSyncState('error')
        setNoteSyncError(error?.message||'Could not sync notes. Local copies are safe.')
      }
    }finally{
      notesSyncPromise.current=null
      if(notesSyncQueued.current){notesSyncQueued.current=false;setNoteSyncSignal(n=>n+1)}
    }
  },[noteScope,session,user?.id,online])
  useEffect(()=>{
    if(session!=='cloud'||!online)return
    const id=setTimeout(()=>void syncNotesNow(),750)
    return()=>clearTimeout(id)
  },[session,online,noteSyncSignal,resumeSignal,syncNotesNow])

  useEffect(()=>{
    let mounted=true
    const listeners=[]
    const listen=(promise)=>Promise.resolve(promise).then(handle=>{
      if(!mounted)void handle.remove()
      else listeners.push(handle)
    }).catch(()=>{})
    void Network.getStatus().then(status=>{if(mounted)setOnline(Boolean(status.connected))})
      .catch(()=>{if(mounted)setOnline(navigator.onLine)})
    listen(Network.addListener('networkStatusChange',status=>{
      setOnline(Boolean(status.connected))
      if(status.connected)setResumeSignal(n=>n+1)
    }))
    listen(NativeApp.addListener('appStateChange',state=>{
      if(!state.isActive){
        document.documentElement.dataset.daymarkBackground='true'
        if(!authPromptActive.current)setUnlockGranted(false)
      }else{
        document.documentElement.dataset.daymarkBackground='false'
        setResumeSignal(n=>n+1)
      }
    }))
    return()=>{
      mounted=false
      for(const handle of listeners)void handle.remove()
      document.documentElement.dataset.daymarkBackground='false'
    }
  },[])
  useEffect(() => {
    const onKey = e => {
      if (session !== 'demo' && session !== 'cloud') return
      if(session==='cloud'&&biometricLockEnabled(localStorage,user?.id)&&!unlockGranted)return
      if (e.metaKey || e.ctrlKey) {
        if (e.key.toLowerCase() === 'k') { e.preventDefault();searchRef.current?.focus() }
        return
      }
      const el = e.target
      const editing = ['INPUT','TEXTAREA','SELECT'].includes(el?.tagName) || el?.isContentEditable
      if (editing || modal || noteEditor) return
      if (e.key.toLowerCase() === 'n') { e.preventDefault();setModal({}) }
      if (e.key.toLowerCase() === 'q') { e.preventDefault();openQuickNote() }
      if (e.key === '/') { e.preventDefault();searchRef.current?.focus() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [modal, noteEditor, session, noteScope, unlockGranted, user?.id])

  const startDemo = () => { feel('success');setTasks(getDemo());setSession('demo');setView('inbox') }
  const authenticated = person => {markOnboardingSeen(localStorage);setOnboardingComplete(true);setUser(person);setUnlockGranted(false);setSession('cloud');setView('inbox')}
  const unlockWithBiometric = async()=>{
    if(biometricBusy)return
    authPromptActive.current=true
    setBiometricBusy(true)
    setLockError('')
    try{
      await verifyBiometricLock()
      setUnlockGranted(true)
      feel('success')
    }catch(error){setLockError(error?.message||'Authentication canceled. Try again.')}
    finally{authPromptActive.current=false;setBiometricBusy(false)}
  }
  const toggleBiometricLock=async()=>{
    if(session!=='cloud'||!user?.id||biometricBusy)return
    authPromptActive.current=true
    setBiometricBusy(true)
    try{
      const enabled=biometricLockEnabled(localStorage,user.id)
      if(!enabled){
        const availability=await checkBiometricAvailability()
        if(!availability.isAvailable)throw new Error(availability.reason||'Set up fingerprint unlock in Android Settings')
      }
      await verifyBiometricLock()
      setBiometricLockEnabled(localStorage,user.id,!enabled)
      setUnlockGranted(true)
      setLockEpoch(n=>n+1)
      feel('success')
      notify(enabled?'App lock disabled':'App lock enabled. Daymark will lock when you leave the app.')
    }catch(error){notify(error?.message||'Unable to change app lock')}
    finally{authPromptActive.current=false;setBiometricBusy(false)}
  }
  const signOut = async () => {
    if (session === 'cloud' && insforge) {
      const {error} = await insforge.auth.signOut()
      if (error) {notify(error.message);return}
    }
    setUnlockGranted(false);setSidebarOpen(false);setUser(null);setTasks([]);setNotes([]);setNoteEditor(null);setSession('guest');setQuery('');setView('inbox')
  }
  const writeDemo = updated => {setTasks(updated);localStorage.setItem(STORAGE, JSON.stringify(updated))}
  const saveTask = async formFields => {
    if (busy) return
    if(session==='cloud'&&!online){notify('You are offline. Task changes need an internet connection; Notes can be edited offline.');return}
    setBusy(true)
    try {
      const {remind_at_time, ...fields} = formFields
      const taskId = modal?.task?.id || crypto.randomUUID()
      const savedTask = {...modal?.task,...fields,id:taskId,is_complete:modal?.task?.is_complete||false}
      if (session === 'demo') {
        if (modal?.task) {
          writeDemo(tasks.map(task=>task.id===taskId?{...task,...fields,updated_at:new Date().toISOString()}:task))
        } else {
          const now = new Date().toISOString()
          writeDemo([{...fields,id:taskId,is_complete:false,created_at:now,updated_at:now},...tasks])
        }
      } else {
        if (!cloudTimeSupported.current && fields.due_time) throw new Error('To save task times in your cloud account, apply migrations/20261017_add_due_time.sql in InsForge first.')
        const cloudFields = cloudTimeSupported.current ? fields : Object.fromEntries(Object.entries(fields).filter(([key])=>key!=='due_time'))
        const req = modal?.task
          ? insforge.database.from('tasks').update(cloudFields).eq('id',taskId)
          : insforge.database.from('tasks').insert([{...cloudFields,id:taskId}])
        const {error} = await req
        if (error) throw error
        await refresh()
      }
      let reminderNote = ''
      // Saving a task is never dependent on Android granting a notification.
      if (isAndroidIslandSupported()) {
        try {
          const result=await syncCalendarReminder(savedTask,remind_at_time,{askPermission:Boolean(remind_at_time)})
          if(result.status==='scheduled') reminderNote=' · Android reminder scheduled (approximate)'
          else if(result.status==='permission-needed') reminderNote=' · Allow notifications in Personalize to enable reminders'
          else if(result.status==='past-or-invalid') reminderNote=' · Choose a future time to receive a reminder'
          else if(remind_at_time) reminderNote=' · Reminder unavailable'
        } catch(error) {
          reminderNote=' · Reminder was not scheduled: '+(error?.message||'Android error')
        }
      }
      setModal(null)
      feel('success')
      notify((modal?.task?'Task updated':'Task added')+reminderNote)
    } catch (e) {feel('error');notify(`Could not save task: ${e.message}`)}
    finally {setBusy(false)}
  }
  const toggleTask = async task => {
    if(session==='cloud'&&!online){notify('Offline: reconnect before changing cloud tasks.');return}
    const value = !task.is_complete
    if (session === 'demo') {
      writeDemo(tasks.map(t => t.id === task.id ? {...t,is_complete:value,updated_at:new Date().toISOString()} : t))
    } else {
      const {error} = await insforge.database.from('tasks').update({is_complete:value}).eq('id',task.id)
      if (error) {notify(error.message);return}
      await refresh()
    }
    if (value) {
      void cancelTaskReminder(task.id).catch(() => {})
      void cancelCalendarReminder(task.id).catch(() => {})
    }
    feel(value ? 'complete' : 'selection')
    notify(value ? 'Nicely done! Task completed.' : 'Task moved back to your list.')
  }
  const deleteTask = async task => {
    if (busy) return false
    if(session==='cloud'&&!online){notify('Offline: reconnect before deleting cloud tasks.');return false}
    if (!window.confirm(`Delete “${task.title}”? This can’t be undone.`)) return false
    setBusy(true)
    try {
      if (session === 'demo') writeDemo(tasks.filter(t=>t.id!==task.id))
      else {
        const {error} = await insforge.database.from('tasks').delete().eq('id',task.id)
        if (error) throw error
        await refresh()
      }
      // Cancel both manual and date-based local notifications. Never make
      // successful cloud deletion depend on Android permission/state.
      void cancelTaskReminder(task.id).catch(() => {})
      void cancelCalendarReminder(task.id).catch(() => {})
      feel('warning')
      notify('Task deleted')
      setModal(current => current?.task?.id===task.id ? null : current)
      return true
    } catch (error) {
      feel('error')
      notify('Could not delete task: '+(error?.message||'Please try again'))
      return false
    } finally {setBusy(false)}
  }
  const remindTask = async (task, minutes) => {
    try {
      await scheduleTaskReminder(task, minutes)
      feel('success')
      notify('Reminder scheduled for approximately ' + minutes + ' minutes from now. Android may deliver it later.')
    } catch (error) {
      feel('error')
      notify(error?.message || 'Could not schedule the reminder')
    }
  }
  const rescheduleTask = async (task, dueDate) => {
    if(session==='cloud'&&!online){notify('Offline: reconnect before rescheduling cloud tasks.');return}
    try {
      if (session === 'demo') {
        writeDemo(tasks.map(t => t.id === task.id ? {...t,due_date:dueDate,updated_at:new Date().toISOString()} : t))
      } else {
        const {error} = await insforge.database.from('tasks').update({due_date:dueDate}).eq('id',task.id)
        if (error) throw error
        await refresh()
      }
      let info=''
      if(isAndroidIslandSupported()){
        try {
          const wasScheduled = await calendarReminderScheduled(task.id)
          if(wasScheduled){
            const result=await syncCalendarReminder({...task,due_date:dueDate},true)
            info=result.status==='scheduled'?' · Reminder moved':result.status==='past-or-invalid'?' · Past reminder cleared':' · Check notification permission'
          }
        }catch {info=' · Check your reminder in Personalize'}
      }
      feel('success')
      notify('Task moved to '+new Date(dueDate+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'})+info)
    } catch (error) {
      feel('error')
      notify('Could not reschedule task: ' + error.message)
    }
  }
  const stats = useMemo(() => getStats(tasks, today), [tasks,today])
  const visible = useMemo(() => filterTasks(tasks,{view,query,priority,sort,today}), [tasks,view,query,priority,sort,today])
  const progress = stats.all ? Math.round(stats.completed / stats.all * 100) : 0
  const navigate = id => {feel('selection');setView(id);setSidebarOpen(false);setAppearanceOpen(false)}
  const opening = (due) => {feel('action');setModal({due})}
  const currentDate = new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'})

  if (session === 'loading') return <ExpressiveLoading kind="app" fullScreen/>
  if (session === 'guest' && !onboardingComplete) return <Onboarding feel={feel} reducedMotion={lessMotion} onComplete={()=>{markOnboardingSeen(localStorage);setOnboardingComplete(true)}}/>
  if (session === 'guest') return <AuthScreen onDemo={startDemo} onAuth={authenticated} onShowIntro={()=>setOnboardingComplete(false)} notify={notify}/>
  if(session==='cloud'&&biometricLockEnabled(localStorage,user?.id)&&!unlockGranted) return <div className="daymark-lock-screen" role="main" aria-label="Daymark app locked"><div className="daymark-lock-card"><div className="daymark-lock-badge"><Fingerprint size={36}/></div><span className="modal-kicker">PRIVATE WORKSPACE</span><h1>Daymark is locked.</h1><p>Confirm your fingerprint or device screen lock to open your workspace.</p><button className="daymark-lock-unlock" type="button" disabled={biometricBusy} onClick={()=>void unlockWithBiometric()}><Fingerprint size={20}/>{biometricBusy?'Checking…':'Unlock Daymark'}</button>{lockError&&<p role="alert" className="daymark-lock-error">{lockError}</p>}<button className="daymark-lock-exit" type="button" disabled={biometricBusy} onClick={()=>void signOut()}>Sign out instead</button></div></div>

  const renderTask = (task, index) => {
    const due = getDueLabel(task.due_date, today)
    const overdue = task.due_date && task.due_date < today && !task.is_complete
    return <GestureTaskRow key={task.id} task={task} index={index} due={due} overdue={overdue}
      today={today} tomorrow={shiftDate(1)} reducedMotion={lessMotion} feel={feel}
      onToggle={toggleTask} onEdit={t=>{feel('action');setModal({task:t})}}
      onDelete={deleteTask} onReschedule={rescheduleTask} onRemind={isAndroidIslandSupported() ? remindTask : undefined}/>
  }
  const groups = view === 'inbox' && sort === 'smart' && !query && priority === 'all'
    ? [
        {name:'Needs attention', items: visible.filter(t=>!t.is_complete && t.due_date && t.due_date<today)},
        {name:'On your list', items:visible.filter(t=>!t.is_complete && (!t.due_date||t.due_date>=today))},
        {name:'Already done', items:visible.filter(t=>t.is_complete)},
      ].filter(group=>group.items.length)
    : [{name:view==='completed'?'Finished tasks':'Your tasks',items:visible}]

  return <MotionConfig reducedMotion={lessMotion ? "always" : "user"} transition={SPRING}><div className="app-shell">
    <aside className={`sidebar ${sidebarOpen?'mobile-open':''}`}>
      <div className="sidebar-top"><Logo light /><button className="sidebar-close" onClick={()=>{feel('selection');setSidebarOpen(false)}} aria-label="Close menu"><X size={18}/></button></div>
      <div className="sidebar-scroll" data-testid="sidebar-scroll">
      <div className="workspace-label">WORKSPACE <ChevronDown size={13}/></div>
      <nav className="side-nav" aria-label="Task views">
        {NAV.map(item => <button key={item.id} className={`nav-button ${view===item.id?'selected':''}`} onClick={()=>navigate(item.id)}><item.icon size={18}/><span>{item.label}</span><span className="nav-count">{item.id==='notes'?notes.length:(stats[item.id==='inbox'?'all':item.id] || 0)}</span></button>)}
      </nav>
      <div className="nav-divider"/>
      <div className="workspace-label">QUICK ACCESS</div>
      <button className="nav-button quick-access" onClick={()=>{setView('inbox');setPriority('high');setSidebarOpen(false)}}><span className="small-priority-dot"/> <span>High priority</span></button>
      <button className="nav-button quick-access" onClick={()=>{setView('inbox');setPriority('all');setSidebarOpen(false);setModal({due:today})}}><Plus size={18}/> <span>New task</span></button>
      <div className="sidebar-spacer"/>
      <div className="sidebar-tip"><div className="tip-icon"><Sparkles size={18}/></div><h3>Make it happen.</h3><p>Big things start with small, consistent steps.</p><button onClick={()=>opening(today)}>Plan your day <ArrowRight size={15}/></button></div>
      </div>
      <div className="sidebar-footer">
        {session==='cloud'&&isNativeBiometricDevice()&&<button type="button" className="sidebar-lock-toggle"
          disabled={biometricBusy} onClick={()=>void toggleBiometricLock()}
          aria-label={biometricLockEnabled(localStorage,user?.id)?'Disable biometric app lock':'Enable biometric app lock'}>
          <Fingerprint size={18}/>
          <span>{biometricLockEnabled(localStorage,user?.id)?'App lock enabled':'Enable app lock'}</span>
          <span className="sidebar-lock-state">{biometricLockEnabled(localStorage,user?.id)?'On':'Off'}</span>
        </button>}
        <button className="profile" type="button" onClick={signOut}
          title={session==='demo'?'Exit demo and open sign in':'Sign out'}
          aria-label={session==='demo'?'Exit demo and open sign in':'Sign out of Daymark'}>
          <span className="profile-avatar">{session==='demo'?'D':(user?.email||'U')[0].toUpperCase()}</span>
          <span className="profile-text">
            <strong>{session==='demo'?'Demo workspace':(user?.name || user?.email?.split('@')[0] || 'Your space')}</strong>
            <small>{session==='demo'?'Exit demo · Sign in':'Sign out of account'}</small>
          </span>
          <LogOut size={19} aria-hidden="true"/>
        </button>
      </div>
    </aside>
    {sidebarOpen && <div className="mobile-dim" onClick={()=>setSidebarOpen(false)}/>}

    <div className="app-content">
      <header className="topbar"><div className="topbar-leading"><button className="mobile-menu icon-button" onClick={()=>{feel('selection');setSidebarOpen(true)}} aria-label="Open menu"><LayoutGrid size={21}/></button><span className="breadcrumb">Workspace <span>/</span> <strong>{NAV.find(x=>x.id===view)?.label}</strong></span></div><div className="topbar-actions"><span className="topbar-date"><CalendarDays size={15}/> {currentDate}</span><button className="appearance-trigger theme-button" title="Personalize Daymark" aria-label="Personalize appearance" aria-expanded={appearanceOpen} onClick={()=>{feel('selection');setAppearanceOpen(open=>!open)}}><Sparkles size={18}/></button><button className="theme-button" title={`Switch to ${theme==='light'?'dark':'light'} mode`} onClick={()=>{feel('selection');setTheme(theme==='light'?'dark':'light')}}>{theme==='light'?<Moon size={18}/>:<Sun size={18}/>}</button><span className={'daymark-connection-badge'+(online?'':' is-offline')} title={online?'Online · Cloud sync active':'Offline · Notes queue locally'} aria-label={online?'Connected':'Offline'}>{online?<Wifi size={16}/>:<WifiOff size={16}/>}</span><span className="header-avatar daymark-profile-avatar" title={online?'Account · Connected':'Account · Offline'}>{session==='demo'?'D':(user?.email||'U')[0].toUpperCase()}<span className={'daymark-avatar-status'+(online?'':' is-offline')} aria-hidden="true">{online?<Wifi size={11}/>:<WifiOff size={11}/>}</span></span></div></header>
      <AnimatePresence>{appearanceOpen && <motion.div className="appearance-scrim v04-appearance-scrim" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:lessMotion?0:.2}} onMouseDown={event=>{if(event.target===event.currentTarget)setAppearanceOpen(false)}}>
        <motion.section className="appearance-panel v04-appearance-panel" role="dialog" aria-modal="true" aria-labelledby="appearance-title" initial={lessMotion?false:{opacity:0,x:26,y:24,scale:.97}} animate={{opacity:1,x:0,y:0,scale:1}} exit={lessMotion?{opacity:0}:{opacity:0,x:24,y:24,scale:.97}} transition={lessMotion?{duration:0}:SPRING}>
          <div className="appearance-header"><div><span className="modal-kicker">YOUR DAY, YOUR WAY</span><h2 id="appearance-title">Make it yours <Sparkles size={20}/></h2><p>A little color makes every day brighter.</p></div><button className="icon-button" aria-label="Close appearance settings" onClick={()=>setAppearanceOpen(false)}><X size={19}/></button></div>
          <fieldset className="palette-options"><legend>COLOR STORY</legend>
            {[
              {id:'iris',label:'Iris',description:'Playful violet'},
              {id:'lagoon',label:'Lagoon',description:'Deep turquoise'},
              {id:'citrus',label:'Citrus',description:'Sunny amber'},
              {id:'rose',label:'Rose',description:'Warm berry'},
            ].map(choice=><button key={choice.id} type="button" className={`palette-option ${palette===choice.id?'selected':''}`} aria-pressed={palette===choice.id} onClick={()=>{setPalette(choice.id);feel('selection')}}>
              <span className={`palette-swatch palette-${choice.id}`}>{palette===choice.id && <Check size={18}/>}</span><span><strong>{choice.label}</strong><small>{choice.description}</small></span>
            </button>)}
          </fieldset>
          <div className="motion-choice"><div><strong>Gentle motion</strong><p>Keep expressive transitions on, or reduce animation.</p></div><button className={`motion-toggle ${lessMotion?'selected':''}`} aria-label="Reduce animation" aria-pressed={lessMotion} onClick={()=>{feel('selection');setLessMotion(value=>!value)}}><span/></button></div>
          <div className="haptic-section">
            <div className="haptic-section-title"><strong>Touch feedback</strong><p>Crisp, Pixel-tuned touch feedback. Your Android vibration settings are respected.</p></div>
            <div className="haptic-options" role="group" aria-label="Haptic feedback intensity">
              {['off','subtle','balanced','strong'].map(level=><button key={level} type="button" className={hapticLevel===level?'selected':''} aria-pressed={hapticLevel===level} onClick={()=>{setHapticLevel(level);feel('selection',level)}}>{level}</button>)}
            </div>
            <div className="haptic-samples" role="group" aria-label="Compare native haptic feedback">
              {[
                {kind:'selection',label:'Soft tick'},
                {kind:'action',label:'Button click'},
                {kind:'complete',label:'Task done'},
              ].map(sample=><button key={sample.kind} type="button" disabled={hapticLevel==='off'} onClick={()=>feel(sample.kind)} aria-label={`Try ${sample.label} feedback`}><span className="haptic-sample-icon"><Sparkles size={14}/></span><span>{sample.label}</span></button>)}
            </div>
          </div>
          <Suspense fallback={<ExpressiveLoading kind="settings" compact/>}><IslandSettings notify={notify} feel={feel}/></Suspense>
          <button className="button-primary appearance-done" onClick={()=>{feel('action');setAppearanceOpen(false)}}>Looks good <Check size={18}/></button>
        </motion.section>
      </motion.div>}</AnimatePresence>
      <main className="main-area">
        <div className="page-heading"><div><div className="eyebrow page-eyebrow"><span className="eyebrow-line"/> A FRESH PERSPECTIVE</div><h1>{TITLES[view][0]}<span className="heading-period">.</span></h1><p>{TITLES[view][1]}</p></div><button className="button-primary heading-add" onClick={()=>view==='notes'?openQuickNote():opening(view==='today'?today:null)}><Plus size={18}/> {view==='notes'?'Quick note':'New task'}</button></div>
        {session==='cloud'&&!online&&view!=='notes'&&<p className="daymark-offline-tasks" role="status"><WifiOff size={17}/> Offline · Showing saved cloud tasks. Reconnect to edit tasks or refresh updates.</p>}
        <Suspense fallback={<ExpressiveLoading kind={view==='calendar'?'calendar':view==='notes'?'notes':'tasks'}/>}>
        {view==='notes' ? <NotesWorkspace notes={notes} cloudMode={session==='cloud'} online={online} syncState={noteSyncState} syncError={noteSyncError} pendingCount={session==='cloud'?Object.keys(readNotesOutbox(localStorage,noteScope)).length:0} onRetry={()=>{setNoteSyncSignal(n=>n+1);setResumeSignal(n=>n+1)}} onNew={openQuickNote} onOpen={editNote} onPin={pinNote} onDelete={deleteSavedNote} feel={feel} reducedMotion={lessMotion}/> : view==='calendar' ? <ExpressiveCalendar tasks={tasks} selected={selectedCalendarDate} onSelect={setSelectedCalendarDate}
          onCreate={day=>setModal({due:day})} onEdit={task=>setModal({task})} onDelete={deleteTask}
          onMove={rescheduleTask} feel={feel} lessMotion={lessMotion} busy={busy}/> : <>
        <div className="hero-row"><div className="hero-card"><div className="hero-copy"><span className="hero-overline"><Sparkles size={15}/> YOUR DAILY MOMENTUM</span><h2>Make room for <em>progress.</em></h2><p>You don’t have to do it all. Just take the next step.</p><button className="hero-link" onClick={()=>navigate('today')}>See today’s tasks <ArrowRight size={16}/></button></div><div className="hero-orbit ring-one"/><div className="hero-orbit ring-two"/><div className="hero-flower">✳</div></div><div className="progress-card"><div className="progress-card-top"><span>YOUR PROGRESS</span><span className="progress-icon"><CheckCheck size={19}/></span></div><div className="progress-value">{progress}<span>%</span></div><p>{stats.completed} of {stats.all} tasks complete</p><div className="progress-track"><motion.span initial={false} animate={{width:`${progress}%`}} transition={lessMotion?{duration:0}:{type:"spring",stiffness:180,damping:30,mass:.8}}/></div><div className="progress-bottom">{progress===100 && stats.all ? 'All caught up — amazing work!' : 'Keep your momentum going'}<ArrowUpRight size={16}/></div></div></div>
        <div className="stat-grid"><button className="stat-card" onClick={()=>navigate('today')}><span className="stat-icon stat-orange"><Clock3 size={18}/></span><div><span className="stat-value">{stats.today}</span><span className="stat-name">Due today & overdue</span></div><ArrowUpRight className="stat-arrow" size={18}/></button><button className="stat-card" onClick={()=>navigate('upcoming')}><span className="stat-icon stat-purple"><CalendarDays size={18}/></span><div><span className="stat-value">{stats.upcoming}</span><span className="stat-name">Coming up</span></div><ArrowUpRight className="stat-arrow" size={18}/></button><button className="stat-card" onClick={()=>navigate('completed')}><span className="stat-icon stat-green"><CheckCircle2 size={18}/></span><div><span className="stat-value">{stats.completed}</span><span className="stat-name">Tasks completed</span></div><ArrowUpRight className="stat-arrow" size={18}/></button></div>
        <section className="task-panel"><div className="task-panel-top"><div><h2>{view==='inbox'?'Your to-dos':view==='today'?'Your focus list':view==='upcoming'?'Coming up':'Completed tasks'} <span className="task-count">{visible.length}</span></h2><p>A little organization goes a long way.</p></div><div className="task-panel-tools"><button className="text-icon-button" onClick={()=>{setView('inbox');setPriority('all');setQuery('')}}><ListFilter size={16}/> Reset filters</button></div></div>
          <p className="v04-hint"><Sparkles size={14}/> Swipe right to complete · Swipe left for actions · Hold for more</p>
          <div className="task-filters"><div className="search-box"><Search size={18}/><input ref={searchRef} placeholder="Search your tasks..." aria-label="Search tasks" value={query} onChange={e=>setQuery(e.target.value)}/><kbd>⌘ K</kbd></div><div className="filter-selects"><select aria-label="Filter priority" value={priority} onChange={e=>setPriority(e.target.value)}><option value="all">All priorities</option><option value="high">High priority</option><option value="medium">Medium priority</option><option value="low">Low priority</option></select><select aria-label="Sort tasks" value={sort} onChange={e=>setSort(e.target.value)}><option value="smart">Smart sort</option><option value="due">Due date</option><option value="priority">Priority</option></select></div></div>
          {loadingTasks ? <ExpressiveLoading kind="tasks"/> : visible.length ? <LayoutGroup id="daymark-task-list"><div className="task-list">{groups.map(group=><motion.div layout={lessMotion ? false : "position"} className="task-group" key={group.name}><div className="task-group-title"><span>{group.name}</span><span>{group.items.length}</span></div><AnimatePresence initial={false}>{group.items.map(renderTask)}</AnimatePresence></motion.div>)}</div></LayoutGroup> : <div className="empty-state"><div className="empty-illustration"><CheckCheck size={28}/></div><h3>{query || priority!=='all'?'No matching tasks':'A little space to breathe.'}</h3><p>{query || priority!=='all'?'Try a different search or filter.':'No tasks in this view yet. Add one and get moving.'}</p><button className="button-primary" onClick={()=>opening(view==='today'?today:null)}><Plus size={17}/> Add a task</button></div>}
          <div className="task-panel-bottom"><div><Keyboard size={16}/> Press <kbd>N</kbd> to create a task · <kbd>/</kbd> to search</div><span>{stats.active} left to do</span></div>
        </section>
        </>}
        </Suspense>
        <footer className="app-footer"><span>Made for the little wins. ✦</span><span>{session==='demo'?'Demo • Saved locally':online?'Cloud tasks · Notes sync on':'Offline · Cached cloud tasks'}</span></footer>
      </main>
    </div>
    <LayoutGroup id="daymark-bottom-navigation"><nav className="bottom-nav" aria-label="Mobile task navigation">
      {NAV.filter(item=>item.id!=='completed').map(item=><button key={item.id} className={`bottom-nav-item ${view===item.id?'active':''}`} aria-current={view===item.id?'page':undefined} onClick={()=>navigate(item.id)}>
        <span className="bottom-nav-icon">{view===item.id && (lessMotion ? <span className="v04-nav-pill"/> : <motion.span layoutId="daymark-tab-pill" className="v04-nav-pill" transition={SPRING}/>)}
          <item.icon className="v04-nav-icon" size={22}/>
        </span>
        <span>{item.label==='All tasks'?'Home':item.label}</span>
      </button>)}
    </nav></LayoutGroup>
    <ExpressiveFabMenu onNewTask={()=>opening(view==='today'?today:null)} onQuickNote={openQuickNote} onNotes={()=>navigate('notes')} feel={feel} reducedMotion={lessMotion}/>
    <AnimatePresence>{noteEditor && <QuickNoteEditor key={noteEditor.id} cloudMode={session==='cloud'} note={noteEditor} onChange={updateNote} onClose={()=>setNoteEditor(null)} onPin={()=>updateNote({...noteEditor,pinned:!noteEditor.pinned})} feel={feel} reducedMotion={lessMotion}/>}</AnimatePresence>
    <AnimatePresence>{modal && <TaskModal key={modal.task?.id||'new'} task={modal.task} initialDue={modal.due} busy={busy} reducedMotion={lessMotion} feel={feel} onSave={saveTask} onDelete={deleteTask} onClose={()=>!busy&&setModal(null)}/>}</AnimatePresence>
    <AnimatePresence>{toast && <motion.div key={toast} role="status" className="toast v04-toast" initial={lessMotion?false:{opacity:0,y:16,scale:.94}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:8,scale:.98}} transition={lessMotion?{duration:.05}:SPRING}><CheckCircle2 size={17}/>{toast}<button aria-label="Dismiss notification" onClick={()=>setToast('')}><X size={15}/></button></motion.div>}</AnimatePresence>
  </div></MotionConfig>
}

export default App
