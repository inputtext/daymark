// Pure, local-calendar helpers: avoid UTC parsing shifting dates across timezones.
export const parseLocalDay = iso => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso))) return null
  const [year, month, day] = iso.split('-').map(Number)
  const result = new Date(year, month - 1, day, 12)
  return result.getFullYear() === year && result.getMonth() === month - 1 &&
    result.getDate() === day ? result : null
}
export const localISO = date => {
  const d = new Date(date)
  return [d.getFullYear(), String(d.getMonth()+1).padStart(2,'0'), String(d.getDate()).padStart(2,'0')].join('-')
}
export const addLocalDays = (iso, days) => {
  const date = parseLocalDay(iso)
  if (!date) throw new Error('Invalid calendar date')
  date.setDate(date.getDate() + days)
  return localISO(date)
}
export const monthStart = iso => {
  const date = parseLocalDay(iso)
  if (!date) throw new Error('Invalid calendar date')
  return localISO(new Date(date.getFullYear(),date.getMonth(),1,12))
}
export const shiftMonth = (iso, delta) => {
  const date = parseLocalDay(iso)
  if (!date) throw new Error('Invalid calendar date')
  return localISO(new Date(date.getFullYear(), date.getMonth()+delta, 1, 12))
}
export const weekStart = iso => {
  const date = parseLocalDay(iso)
  if (!date) throw new Error('Invalid calendar date')
  date.setDate(date.getDate()-date.getDay())
  return localISO(date)
}
export const weekDates = iso => Array.from({length:7},(_,i)=>addLocalDays(weekStart(iso),i))
export const monthDates = iso => {
  const first = monthStart(iso)
  const begin = weekStart(first)
  const days = new Date(parseLocalDay(first).getFullYear(),parseLocalDay(first).getMonth()+1,0).getDate()
  const count = Math.ceil((parseLocalDay(first).getDay()+days)/7)*7
  return Array.from({length:count},(_,i)=>addLocalDays(begin,i))
}
export const timeLabel = value => {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value||'')) return ''
  const [hour,minute]=value.split(':').map(Number)
  return String(hour%12||12)+':'+String(minute).padStart(2,'0')+(hour>=12?' PM':' AM')
}
export const tasksOnDay = (tasks, day) => tasks.filter(task=>task.due_date===day)
export const sortedDayTasks = tasks => [...tasks].sort((a,b)=>(a.due_time||'99:99').localeCompare(b.due_time||'99:99') || (a.title||'').localeCompare(b.title||''))
