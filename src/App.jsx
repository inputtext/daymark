import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowRight, ArrowUpRight, CalendarDays, Check, CheckCheck, CheckCircle2,
  ChevronDown, Circle, Clock3, Command, Inbox, Keyboard, LayoutGrid, ListFilter,
  LoaderCircle, LockKeyhole, LogOut, Mail, Moon, MoreHorizontal, Pencil,
  Plus, Search, ShieldCheck, Sparkles, Sun, Trash2, X,
} from 'lucide-react'
import { insforge, INSFORGE_CONFIGURED } from './lib/insforge.js'
import { createDemoTasks, dateISO, filterTasks, getDueLabel, getStats, shiftDate } from './lib/tasks.js'

const STORAGE = 'daymark:demo-tasks:v1'
const THEME = 'daymark:theme'
const NAV = [
  { id: 'inbox', label: 'All tasks', icon: LayoutGrid },
  { id: 'today', label: 'Today', icon: Sun },
  { id: 'upcoming', label: 'Upcoming', icon: CalendarDays },
  { id: 'completed', label: 'Completed', icon: CheckCircle2 },
]
const TITLES = {
  inbox: ['Your workspace', 'Everything you need to do, all in one place.'],
  today: ['Today’s focus', 'Small steps add up to big things.'],
  upcoming: ['On the horizon', 'Stay one step ahead of what’s next.'],
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

function AuthScreen({ onDemo, onAuth, notify }) {
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

  return <div className="welcome-shell">
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
        <div className="eyebrow"><Sparkles size={15} /> ORGANIZE YOUR DAY, YOUR WAY</div>
        <h2>{verification ? 'Verify your email' : tab === 'signup' ? 'Create your space' : 'Welcome to a clearer day.'}</h2>
        <p className="auth-subtitle">{verification ? `Enter the code sent to ${email}, or use the link in your inbox.` : 'A simpler way to keep everything moving. Start where you are.'}</p>
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
          <div className="or-divider"><span>or take a look first</span></div>
        </> : <div className="demo-note"><ShieldCheck size={18}/><span>Preview mode is ready. Connect InsForge to enable secure accounts and cloud sync.</span></div>}
        <button type="button" className="button-demo" onClick={onDemo}><Sparkles size={18}/> Explore the demo <ArrowUpRight size={17}/></button>
        <p className="auth-footnote"><ShieldCheck size={14}/> {INSFORGE_CONFIGURED ? 'Your tasks are private to your account.' : 'Demo tasks stay in this browser.'}</p>
      </div>
      <span className="welcome-bottom-right">Build better days, gently. ✦</span>
    </div>
  </div>
}

function TaskModal({ task, initialDue, onClose, onSave, busy }) {
  const [title, setTitle] = useState(task?.title || '')
  const [notes, setNotes] = useState(task?.notes || '')
  const [dueDate, setDueDate] = useState(task?.due_date || initialDue || '')
  const [priority, setPriority] = useState(task?.priority || 'medium')
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
    onSave({ title: clean, notes: notes.trim(), due_date: dueDate || null, priority })
  }
  return <div className="modal-shade" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}>
    <section className="modal" role="dialog" aria-modal="true" aria-labelledby="task-modal-title">
      <div className="modal-head"><div><span className="modal-kicker">YOUR TO-DO LIST</span><h2 id="task-modal-title">{task ? 'Edit task' : 'Create a task'}</h2></div><button className="icon-button" aria-label="Close" onClick={onClose}><X size={21}/></button></div>
      <form onSubmit={save} className="task-form">
        <label>Task name <input ref={titleRef} className="form-input" maxLength={240} required placeholder="What needs to get done?" value={title} onChange={e=>setTitle(e.target.value)}/></label>
        <label>Notes <textarea className="form-input" maxLength={4000} rows={3} placeholder="Add a little context (optional)" value={notes} onChange={e=>setNotes(e.target.value)}/></label>
        <div className="form-cols"><label>Due date <input type="date" className="form-input" value={dueDate} onChange={e=>setDueDate(e.target.value)}/></label><label>Priority <select className="form-input" value={priority} onChange={e=>setPriority(e.target.value)}><option value="low">Low priority</option><option value="medium">Medium priority</option><option value="high">High priority</option></select></label></div>
        <div className="modal-actions"><button type="button" className="button-cancel" onClick={onClose}>Cancel</button><button className="button-primary" type="submit" disabled={busy}>{busy ? <LoaderCircle size={17} className="spin"/> : <Plus size={17}/>} {task ? 'Save changes' : 'Add task'}</button></div>
      </form>
    </section>
  </div>
}

function App() {
  const [session, setSession] = useState('loading') // loading | guest | demo | cloud
  const [user, setUser] = useState(null)
  const [tasks, setTasks] = useState([])
  const [view, setView] = useState('inbox')
  const [query, setQuery] = useState('')
  const [priority, setPriority] = useState('all')
  const [sort, setSort] = useState('smart')
  const [modal, setModal] = useState(null) // null | {task?, due?}
  const [busy, setBusy] = useState(false)
  const [loadingTasks, setLoadingTasks] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [toast, setToast] = useState('')
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME) || 'light')
  const searchRef = useRef(null)
  const today = dateISO()
  const notify = useCallback(message => setToast(message), [])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem(THEME, theme)
  }, [theme])
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
      if (!error && data?.user) {setUser(data.user);setSession('cloud')}
      else setSession('guest')
    }).catch(() => {if (alive) setSession('guest')})
    return () => {alive = false}
  }, [])

  const refresh = useCallback(async () => {
    if (!insforge) return
    setLoadingTasks(true)
    const {data, error} = await insforge.database.from('tasks')
      .select('id,user_id,title,notes,due_date,priority,is_complete,created_at,updated_at')
      .order('created_at', {ascending:false})
      .limit(1000)
    if (error) notify(error.message || 'Could not load tasks. Check the database migration.')
    else setTasks(data || [])
    setLoadingTasks(false)
  }, [notify])
  useEffect(() => { if (session === 'cloud' && user) void refresh() }, [session, user, refresh])
  useEffect(() => {
    const onKey = e => {
      if (session !== 'demo' && session !== 'cloud') return
      if (e.metaKey || e.ctrlKey) {
        if (e.key.toLowerCase() === 'k') { e.preventDefault();searchRef.current?.focus() }
        return
      }
      const el = e.target
      const editing = ['INPUT','TEXTAREA','SELECT'].includes(el?.tagName) || el?.isContentEditable
      if (editing || modal) return
      if (e.key.toLowerCase() === 'n') { e.preventDefault();setModal({}) }
      if (e.key === '/') { e.preventDefault();searchRef.current?.focus() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [modal, session])

  const startDemo = () => { setTasks(getDemo());setSession('demo');setView('inbox') }
  const authenticated = person => {setUser(person);setSession('cloud');setView('inbox')}
  const signOut = async () => {
    if (session === 'cloud' && insforge) {
      const {error} = await insforge.auth.signOut()
      if (error) {notify(error.message);return}
    }
    setUser(null);setTasks([]);setSession('guest');setQuery('');setView('inbox')
  }
  const writeDemo = updated => {setTasks(updated);localStorage.setItem(STORAGE, JSON.stringify(updated))}
  const saveTask = async fields => {
    if (busy) return
    setBusy(true)
    try {
      if (session === 'demo') {
        if (modal?.task) {
          writeDemo(tasks.map(task => task.id === modal.task.id ? {...task,...fields,updated_at:new Date().toISOString()} : task))
        } else {
          const now = new Date().toISOString()
          writeDemo([{...fields,id:crypto.randomUUID(),is_complete:false,created_at:now,updated_at:now}, ...tasks])
        }
      } else {
        const req = modal?.task
          ? insforge.database.from('tasks').update(fields).eq('id',modal.task.id)
          : insforge.database.from('tasks').insert([fields])
        const {error} = await req
        if (error) throw error
        await refresh()
      }
      setModal(null)
      notify(modal?.task ? 'Task updated successfully' : 'A new task was added')
    } catch (e) {notify(`Could not save task: ${e.message}`)}
    finally {setBusy(false)}
  }
  const toggleTask = async task => {
    const value = !task.is_complete
    if (session === 'demo') {
      writeDemo(tasks.map(t => t.id === task.id ? {...t,is_complete:value,updated_at:new Date().toISOString()} : t))
    } else {
      const {error} = await insforge.database.from('tasks').update({is_complete:value}).eq('id',task.id)
      if (error) {notify(error.message);return}
      setTasks(previous => previous.map(t => t.id === task.id ? {...t,is_complete:value,updated_at:new Date().toISOString()} : t))
    }
    notify(value ? 'Nicely done! Task completed.' : 'Task moved back to your list.')
  }
  const deleteTask = async task => {
    if (!window.confirm(`Delete “${task.title}”? This can’t be undone.`)) return
    if (session === 'demo') writeDemo(tasks.filter(t=>t.id!==task.id))
    else {
      const {error} = await insforge.database.from('tasks').delete().eq('id',task.id)
      if (error) {notify(error.message);return}
      setTasks(previous => previous.filter(t => t.id !== task.id))
    }
    notify('Task deleted')
  }
  const stats = useMemo(() => getStats(tasks, today), [tasks,today])
  const visible = useMemo(() => filterTasks(tasks,{view,query,priority,sort,today}), [tasks,view,query,priority,sort,today])
  const progress = stats.all ? Math.round(stats.completed / stats.all * 100) : 0
  const navigate = id => {setView(id);setSidebarOpen(false)}
  const opening = (due) => setModal({due})
  const currentDate = new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'})

  if (session === 'loading') return <div className="splash"><Logo /><LoaderCircle size={28} className="spin"/></div>
  if (session === 'guest') return <AuthScreen onDemo={startDemo} onAuth={authenticated} notify={notify}/>

  const renderTask = task => {
    const due = getDueLabel(task.due_date,today)
    const overdue = task.due_date && task.due_date < today && !task.is_complete
    return <article key={task.id} className={`task-row ${task.is_complete?'task-done':''}`}>
      <button title={task.is_complete?'Mark incomplete':'Mark complete'} aria-label={`${task.is_complete?'Mark incomplete':'Complete'}: ${task.title}`} className={`task-toggle ${task.is_complete?'is-checked':''}`} onClick={()=>toggleTask(task)}>{task.is_complete?<Check size={17} strokeWidth={3}/>:null}</button>
      <div className="task-main"><span className="task-name">{task.title}</span>{task.notes && <p className="task-notes">{task.notes}</p>}</div>
      <div className="task-labels"><span className={`priority-badge priority-${task.priority}`}><span className="badge-circle" />{task.priority}</span>{due && <span className={`due-badge ${overdue?'due-overdue':''}`}><CalendarDays size={13}/>{due}</span>}</div>
      <div className="task-actions"><button title="Edit" aria-label={`Edit ${task.title}`} onClick={()=>setModal({task})}><Pencil size={16}/></button><button title="Delete" aria-label={`Delete ${task.title}`} onClick={()=>deleteTask(task)}><Trash2 size={16}/></button></div>
    </article>
  }
  const groups = view === 'inbox' && sort === 'smart' && !query && priority === 'all'
    ? [
        {name:'Needs attention', items: visible.filter(t=>!t.is_complete && t.due_date && t.due_date<today)},
        {name:'On your list', items:visible.filter(t=>!t.is_complete && (!t.due_date||t.due_date>=today))},
        {name:'Already done', items:visible.filter(t=>t.is_complete)},
      ].filter(group=>group.items.length)
    : [{name:view==='completed'?'Finished tasks':'Your tasks',items:visible}]

  return <div className="app-shell">
    <aside className={`sidebar ${sidebarOpen?'mobile-open':''}`}>
      <div className="sidebar-top"><Logo light /><button className="sidebar-close" onClick={()=>setSidebarOpen(false)} aria-label="Close menu"><X size={18}/></button></div>
      <div className="workspace-label">WORKSPACE <ChevronDown size={13}/></div>
      <nav className="side-nav" aria-label="Task views">
        {NAV.map(item => <button key={item.id} className={`nav-button ${view===item.id?'selected':''}`} onClick={()=>navigate(item.id)}><item.icon size={18}/><span>{item.label}</span><span className="nav-count">{stats[item.id==='inbox'?'all':item.id] || 0}</span></button>)}
      </nav>
      <div className="nav-divider"/>
      <div className="workspace-label">QUICK ACCESS</div>
      <button className="nav-button quick-access" onClick={()=>{setView('inbox');setPriority('high');setSidebarOpen(false)}}><span className="small-priority-dot"/> <span>High priority</span></button>
      <button className="nav-button quick-access" onClick={()=>{setView('inbox');setPriority('all');setSidebarOpen(false);setModal({due:today})}}><Plus size={18}/> <span>New task</span></button>
      <div className="sidebar-spacer"/>
      <div className="sidebar-tip"><div className="tip-icon"><Sparkles size={18}/></div><h3>Make it happen.</h3><p>Big things start with small, consistent steps.</p><button onClick={()=>opening(today)}>Plan your day <ArrowRight size={15}/></button></div>
      <div className="sidebar-footer"><button className="profile" onClick={signOut} title="Sign out"><span className="profile-avatar">{session==='demo'?'D':(user?.email||'U')[0].toUpperCase()}</span><span className="profile-text"><strong>{session==='demo'?'Demo workspace':(user?.name || user?.email?.split('@')[0] || 'Your space')}</strong><small>{session==='demo'?'Stored in your browser':'Personal workspace'}</small></span><LogOut size={17}/></button></div>
    </aside>
    {sidebarOpen && <div className="mobile-dim" onClick={()=>setSidebarOpen(false)}/>}

    <div className="app-content">
      <header className="topbar"><div className="topbar-leading"><button className="mobile-menu icon-button" onClick={()=>setSidebarOpen(true)} aria-label="Open menu"><LayoutGrid size={21}/></button><span className="breadcrumb">Workspace <span>/</span> <strong>{NAV.find(x=>x.id===view)?.label}</strong></span></div><div className="topbar-actions"><span className="topbar-date"><CalendarDays size={15}/> {currentDate}</span><button className="theme-button" title={`Switch to ${theme==='light'?'dark':'light'} mode`} onClick={()=>setTheme(theme==='light'?'dark':'light')}>{theme==='light'?<Moon size={18}/>:<Sun size={18}/>}</button><span className="header-avatar">{session==='demo'?'D':(user?.email||'U')[0].toUpperCase()}</span></div></header>
      <main className="main-area">
        <div className="page-heading"><div><div className="eyebrow page-eyebrow"><span className="eyebrow-line"/> A FRESH PERSPECTIVE</div><h1>{TITLES[view][0]}<span className="heading-period">.</span></h1><p>{TITLES[view][1]}</p></div><button className="button-primary heading-add" onClick={()=>opening(view==='today'?today:null)}><Plus size={18}/> New task</button></div>
        <div className="hero-row"><div className="hero-card"><div className="hero-copy"><span className="hero-overline"><Sparkles size={15}/> YOUR DAILY MOMENTUM</span><h2>Make room for <em>progress.</em></h2><p>You don’t have to do it all. Just take the next step.</p><button className="hero-link" onClick={()=>navigate('today')}>See today’s tasks <ArrowRight size={16}/></button></div><div className="hero-orbit ring-one"/><div className="hero-orbit ring-two"/><div className="hero-flower">✳</div></div><div className="progress-card"><div className="progress-card-top"><span>YOUR PROGRESS</span><span className="progress-icon"><CheckCheck size={19}/></span></div><div className="progress-value">{progress}<span>%</span></div><p>{stats.completed} of {stats.all} tasks complete</p><div className="progress-track"><span style={{width:`${progress}%`}}/></div><div className="progress-bottom">{progress===100 && stats.all ? 'All caught up — amazing work!' : 'Keep your momentum going'}<ArrowUpRight size={16}/></div></div></div>
        <div className="stat-grid"><button className="stat-card" onClick={()=>navigate('today')}><span className="stat-icon stat-orange"><Clock3 size={18}/></span><div><span className="stat-value">{stats.today}</span><span className="stat-name">Due today & overdue</span></div><ArrowUpRight className="stat-arrow" size={18}/></button><button className="stat-card" onClick={()=>navigate('upcoming')}><span className="stat-icon stat-purple"><CalendarDays size={18}/></span><div><span className="stat-value">{stats.upcoming}</span><span className="stat-name">Coming up</span></div><ArrowUpRight className="stat-arrow" size={18}/></button><button className="stat-card" onClick={()=>navigate('completed')}><span className="stat-icon stat-green"><CheckCircle2 size={18}/></span><div><span className="stat-value">{stats.completed}</span><span className="stat-name">Tasks completed</span></div><ArrowUpRight className="stat-arrow" size={18}/></button></div>
        <section className="task-panel"><div className="task-panel-top"><div><h2>{view==='inbox'?'Your to-dos':view==='today'?'Your focus list':view==='upcoming'?'Coming up':'Completed tasks'} <span className="task-count">{visible.length}</span></h2><p>A little organization goes a long way.</p></div><div className="task-panel-tools"><button className="text-icon-button" onClick={()=>{setView('inbox');setPriority('all');setQuery('')}}><ListFilter size={16}/> Reset filters</button></div></div>
          <div className="task-filters"><div className="search-box"><Search size={18}/><input ref={searchRef} placeholder="Search your tasks..." aria-label="Search tasks" value={query} onChange={e=>setQuery(e.target.value)}/><kbd>⌘ K</kbd></div><div className="filter-selects"><select aria-label="Filter priority" value={priority} onChange={e=>setPriority(e.target.value)}><option value="all">All priorities</option><option value="high">High priority</option><option value="medium">Medium priority</option><option value="low">Low priority</option></select><select aria-label="Sort tasks" value={sort} onChange={e=>setSort(e.target.value)}><option value="smart">Smart sort</option><option value="due">Due date</option><option value="priority">Priority</option></select></div></div>
          {loadingTasks ? <div className="empty-state"><LoaderCircle size={29} className="spin"/><h3>Getting your tasks…</h3></div> : visible.length ? <div className="task-list">{groups.map(group=><div className="task-group" key={group.name}><div className="task-group-title"><span>{group.name}</span><span>{group.items.length}</span></div>{group.items.map(renderTask)}</div>)}</div> : <div className="empty-state"><div className="empty-illustration"><CheckCheck size={28}/></div><h3>{query || priority!=='all'?'No matching tasks':'A little space to breathe.'}</h3><p>{query || priority!=='all'?'Try a different search or filter.':'No tasks in this view yet. Add one and get moving.'}</p><button className="button-primary" onClick={()=>opening(view==='today'?today:null)}><Plus size={17}/> Add a task</button></div>}
          <div className="task-panel-bottom"><div><Keyboard size={16}/> Press <kbd>N</kbd> to create a task · <kbd>/</kbd> to search</div><span>{stats.active} left to do</span></div>
        </section>
        <footer className="app-footer"><span>Made for the little wins. ✦</span><span>{session==='demo'?'Demo • Saved locally':'Securely powered by InsForge'}</span></footer>
      </main>
    </div>
    {modal && <TaskModal key={modal.task?.id||'new'} task={modal.task} initialDue={modal.due} busy={busy} onSave={saveTask} onClose={()=>!busy&&setModal(null)}/>}
    {toast && <div role="status" className="toast"><CheckCircle2 size={17}/>{toast}<button aria-label="Dismiss notification" onClick={()=>setToast('')}><X size={15}/></button></div>}
  </div>
}

export default App
