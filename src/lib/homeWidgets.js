import { Capacitor, registerPlugin } from '@capacitor/core'

const WidgetBridge = registerPlugin('DaymarkWidgets')
const MAX_WIDGET_TASKS = 2000
const cleanDate = value => /^\d{4}-\d{2}-\d{2}$/.test(String(value || '')) ? String(value) : ''
const cleanTime = value => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value || '')) ? String(value) : ''

/** Sensitive notes, user email, task IDs and auth credentials never reach launcher storage. */
export function makeWidgetSnapshot(tasks = [], now = new Date()) {
  const entries = (Array.isArray(tasks) ? tasks : []).slice(0, MAX_WIDGET_TASKS).map(task => {
    const completed = Boolean(task.is_complete)
    const lastChanged = task.updated_at ? new Date(task.updated_at) : null
    const completedOn = completed && lastChanged && !Number.isNaN(lastChanged.getTime())
      ? localDay(lastChanged) : ''
    return {
      title: String(task.title || 'Untitled').trim().slice(0, 120),
      due_date: cleanDate(task.due_date),
      due_time: cleanTime(task.due_time),
      is_complete: completed,
      completed_on: completedOn,
    }
  })
  return JSON.stringify({version: 1, generated_on: localDay(now), tasks: entries})
}

export function localDay(date = new Date()) {
  const d = new Date(date)
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-')
}

export const supportsHomeWidgets = () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'

/** The native snapshot is a read-only cache. Never write to the cloud from widgets. */
export async function syncHomeWidgets(tasks) {
  if (!supportsHomeWidgets()) return
  return WidgetBridge.syncSnapshot({payload: makeWidgetSnapshot(tasks)})
}

export async function clearHomeWidgets() {
  if (!supportsHomeWidgets()) return
  return WidgetBridge.clearSnapshot()
}
