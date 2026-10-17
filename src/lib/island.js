import { Capacitor, registerPlugin } from '@capacitor/core'

const DaymarkIsland = registerPlugin('DaymarkIsland')

export const UNSUPPORTED_ISLAND_STATUS = Object.freeze({
  supported: false,
  enabled: false,
  overlayGranted: false,
  notificationsGranted: false,
  scheduledCount: 0,
  delivery: 'inexact',
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
