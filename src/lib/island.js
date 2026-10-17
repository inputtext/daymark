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
