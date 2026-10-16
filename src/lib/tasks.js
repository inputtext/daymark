export const dateISO = (date = new Date()) => {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const shiftDate = (days) => {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return dateISO(d)
}

export const PRIORITY = { high: 0, medium: 1, low: 2 }

export const getDueLabel = (due, today = dateISO()) => {
  if (!due) return null
  if (due < today) return 'Overdue'
  if (due === today) return 'Today'
  const next = new Date(`${today}T12:00:00`)
  next.setDate(next.getDate() + 1)
  if (due === dateISO(next)) return 'Tomorrow'
  return new Date(`${due}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export const filterTasks = (tasks, { view = 'inbox', query = '', priority = 'all', sort = 'smart', today = dateISO() } = {}) => {
  const q = query.trim().toLowerCase()
  let result = tasks.filter(task => {
    if (q && !`${task.title} ${task.notes || ''}`.toLowerCase().includes(q)) return false
    if (priority !== 'all' && task.priority !== priority) return false
    if (view === 'today') return !task.is_complete && task.due_date && task.due_date <= today
    if (view === 'upcoming') return !task.is_complete && task.due_date && task.due_date > today
    if (view === 'completed') return task.is_complete
    return true
  })
  result.sort((a, b) => {
    if (sort === 'priority') return (PRIORITY[a.priority] ?? 1) - (PRIORITY[b.priority] ?? 1) || a.title.localeCompare(b.title)
    if (sort === 'due') return (a.due_date || '9999').localeCompare(b.due_date || '9999') || (PRIORITY[a.priority] ?? 1) - (PRIORITY[b.priority] ?? 1)
    if (a.is_complete !== b.is_complete) return Number(a.is_complete) - Number(b.is_complete)
    const aDue = a.due_date || '9999', bDue = b.due_date || '9999'
    return aDue.localeCompare(bDue) || (PRIORITY[a.priority] ?? 1) - (PRIORITY[b.priority] ?? 1)
  })
  return result
}

export const getStats = (tasks, today = dateISO()) => ({
  all: tasks.length,
  completed: tasks.filter(t => t.is_complete).length,
  active: tasks.filter(t => !t.is_complete).length,
  today: tasks.filter(t => !t.is_complete && t.due_date && t.due_date <= today).length,
  upcoming: tasks.filter(t => !t.is_complete && t.due_date && t.due_date > today).length,
  doneToday: tasks.filter(t => t.is_complete && (t.updated_at || '').slice(0, 10) === today).length,
})

export const createDemoTasks = () => {
  const now = new Date().toISOString()
  const items = [
    ['Review project proposal', 'Finalize the outline and share notes with the team.', 0, 'high', false],
    ['Morning workout', '30 minutes of movement and stretching.', 0, 'medium', true],
    ['Reply to pending emails', 'Clear the important threads before lunch.', 0, 'medium', false],
    ['Plan next week’s priorities', 'Choose the three things that matter most.', 1, 'high', false],
    ['Pick up groceries', 'Coffee, fruit, and a few pantry basics.', 2, 'low', false],
    ['Read 20 pages', 'Make some time to unwind.', 0, 'low', false],
    ['Submit expense report', 'Include travel receipts.', -1, 'high', false],
    ['Organize workspace', 'A fresh desk for a fresh week.', null, 'low', true],
  ]
  return items.map(([title, notes, days, priority, is_complete], index) => ({
    id: `demo-${index}`, title, notes, due_date: days == null ? null : shiftDate(days),
    priority, is_complete, created_at: now, updated_at: is_complete ? now : null,
  }))
}
