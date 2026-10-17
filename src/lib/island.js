import { Capacitor, registerPlugin } from '@capacitor/core'

const DaymarkIsland = registerPlugin('DaymarkIsland')

export const UNSUPPORTED_ISLAND_STATUS = Object.freeze({
  supported: false,
  enabled: false,
  overlayGranted: false,
  notificationsGranted: false,
  scheduledCount: 0,
  delivery: 'inexact',
  placementMode: 'camera',
  placementX: 0,
  placementY: 0,
  placementWidth: 280,
})

export const isAndroidIslandSupported = () => Capacitor.getPlatform() === 'android'

export function reminderId(taskId) {
  const raw = String(taskId ?? '')
  if (!/^[a-zA-Z0-9:_-]{1,95}$/.test(raw)) {
    throw new Error('A valid Daymark task ID is required')
  }
  return 't-' + raw
}

export function cleanReminderTitle(title) {
  const value = String(title ?? '').trim()
  return (value || 'Your Daymark reminder').slice(0, 120)
}

export function reminderTime(minutes, now = Date.now()) {
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 1440) {
    throw new Error('Reminders must be between 1 minute and 24 hours from now')
  }
  return now + minutes * 60_000
}

export async function islandStatus() {
  if (!isAndroidIslandSupported()) return { ...UNSUPPORTED_ISLAND_STATUS }
  return DaymarkIsland.getStatus()
}
export async function setIslandEnabled(enabled) {
  if (!isAndroidIslandSupported()) throw new Error('Floating Island is available in the Android app only')
  return DaymarkIsland.setEnabled({enabled: Boolean(enabled)})
}
export async function syncIslandHaptics(level) {
  if (!isAndroidIslandSupported()) return
  return DaymarkIsland.syncHaptics({level})
}
export const ISLAND_PLACEMENT_DEFAULT = Object.freeze({mode: 'camera', x: 0, y: 0, width: 280})

export function validateIslandPlacement({mode, x, y, width}) {
  if (!['camera', 'safe'].includes(mode)) throw new Error('Choose camera-aligned or below-status-bar placement')
  if (![x, y, width].every(Number.isInteger)) throw new Error('Placement values must be whole numbers')
  if (x < -120 || x > 120 || y < -24 || y > 140 || width < 180 || width > 340) {
    throw new Error('Placement value is outside the supported range')
  }
  return {mode, x, y, width}
}

export async function setIslandPlacement(placement) {
  if (!isAndroidIslandSupported()) throw new Error('Island placement requires Android')
  return DaymarkIsland.setPlacement(validateIslandPlacement(placement))
}

export async function requestIslandOverlay() {
  if (!isAndroidIslandSupported()) throw new Error('Overlay permission is Android-only')
  return DaymarkIsland.requestOverlay()
}
export async function requestIslandNotifications() {
  if (!isAndroidIslandSupported()) throw new Error('Notification permission is Android-only')
  return DaymarkIsland.requestNotifications()
}
export async function previewIsland(title = 'Your next little win') {
  if (!isAndroidIslandSupported()) throw new Error('Floating preview requires Android')
  return DaymarkIsland.preview({title: cleanReminderTitle(title)})
}
export async function scheduleTaskReminder(task, minutes = 10) {
  if (!isAndroidIslandSupported()) throw new Error('Local reminders require the Daymark Android app')
  if (!task?.id) throw new Error('Save the task before scheduling a reminder')
  return DaymarkIsland.schedule({
    id: reminderId(task.id),
    title: cleanReminderTitle(task.title),
    at: reminderTime(minutes),
  })
}
export async function scheduleIslandTest(minutes = 1) {
  if (!isAndroidIslandSupported()) throw new Error('Test reminders require Android')
  const timestamp = Date.now()
  return DaymarkIsland.schedule({
    id: 'island-test-' + timestamp,
    title: 'Daymark Island test · You did it!',
    at: reminderTime(minutes, timestamp),
  })
}
export async function cancelTaskReminder(taskId) {
  if (!isAndroidIslandSupported()) return
  return DaymarkIsland.cancel({id: reminderId(taskId)})
}

/** Calendar reminders use their own native ID so existing manual 10m/1h
 * reminders are never overwritten by changing a task's date. */
export function calendarReminderId(taskId) {
  const raw = String(taskId ?? '')
  if (!/^[a-zA-Z0-9:_-]{1,95}$/.test(raw)) throw new Error('A valid Daymark task ID is required')
  return 'c-' + raw
}

/** Interpret the calendar's local wall-clock HH:mm, not UTC.
 * A missing or past time never schedules an immediate surprise notification.
 */
export function calendarReminderAt(task, now = Date.now()) {
  const day = String(task?.due_date ?? '')
  const time = String(task?.due_time ?? '')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null
  const [year, month, date] = day.split('-').map(Number)
  const [hours, minutes] = time.split(':').map(Number)
  const due = new Date(year, month-1, date, hours, minutes, 0, 0)
  // Guard impossible calendar dates and skipped local times at DST transitions.
  if (due.getFullYear()!==year || due.getMonth()!==month-1 || due.getDate()!==date
      || due.getHours()!==hours || due.getMinutes()!==minutes) return null
  const timestamp = due.getTime()
  return Number.isFinite(timestamp) && timestamp > now + 5000 ? timestamp : null
}

export async function calendarReminderScheduled(taskId) {
  if (!isAndroidIslandSupported()) return false
  const state = await DaymarkIsland.hasReminder({id:calendarReminderId(taskId)})
  return state?.scheduled === true
}

export async function cancelCalendarReminder(taskId) {
  if (!isAndroidIslandSupported()) return
  return DaymarkIsland.cancel({id:calendarReminderId(taskId)})
}

export async function syncCalendarReminder(task, shouldSchedule = true, {askPermission=false} = {}) {
  if (!isAndroidIslandSupported()) return {status:'unsupported'}
  if (!task?.id) throw new Error('Save the task before scheduling its reminder')
  const at = !task.is_complete && shouldSchedule ? calendarReminderAt(task) : null
  if (!at) {
    await cancelCalendarReminder(task.id)
    return {status: shouldSchedule && task.due_date && task.due_time ? 'past-or-invalid' : 'canceled'}
  }
  // Permission is asked only following an explicit user save action. Calendar
  // background moves can reschedule previously permitted alarms but never pop
  // up a permission prompt unexpectedly.
  let status = await islandStatus()
  if (!status.notificationsGranted && askPermission) status = await requestIslandNotifications()
  if (!status.notificationsGranted) return {status:'permission-needed'}
  await DaymarkIsland.schedule({
    id:calendarReminderId(task.id),
    title:cleanReminderTitle(task.title),
    at,
  })
  return {status:'scheduled',at}
}
