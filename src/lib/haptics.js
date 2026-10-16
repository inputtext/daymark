import { Capacitor, registerPlugin } from '@capacitor/core'

/**
 * Daymark's native, device-tuned haptics.
 * No navigator.vibrate(), no timed waveforms, no chained generic impacts.
 *
 * Java bridge: android/app/src/main/java/com/piyush/daymark/DaymarkHapticsPlugin.java
 * View.performHapticFeedback() respects Android's Touch feedback setting.
 */
export const HAPTIC_LEVELS = Object.freeze(['off', 'subtle', 'balanced', 'strong'])
export const HAPTIC_KINDS = Object.freeze(['selection', 'action', 'success', 'complete', 'warning', 'error'])
const DaymarkHaptics = registerPlugin('DaymarkHaptics')

export function normalizeHapticLevel(value) {
  return HAPTIC_LEVELS.includes(value) ? value : 'balanced'
}

export function normalizeHapticKind(value) {
  return HAPTIC_KINDS.includes(value) ? value : 'selection'
}

/** Injectable driver/platform for tests; app never needs to pass options. */
export async function hapticFeedback(kind = 'selection', level = 'balanced', options = {}) {
  const intensity = normalizeHapticLevel(level)
  if (intensity === 'off') return false

  const platform = options.platform ?? Capacitor.getPlatform()
  const visibility = options.visibilityState ??
    (typeof document === 'undefined' ? 'visible' : document.visibilityState)

  // Quiet web/desktop feedback is deliberate: buzzy vibrations are worse
  // than no haptic effect when a tuned Android bridge isn't available.
  if (platform !== 'android' || visibility === 'hidden') return false

  try {
    const plugin = options.driver || DaymarkHaptics
    const result = await plugin.play({ kind: normalizeHapticKind(kind), level: intensity })
    return result?.played === true
  } catch {
    // Never block any task action if the device has haptics disabled, or the
    // native bridge isn't present in a stale Android build.
    return false
  }
}
