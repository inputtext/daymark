import { Capacitor } from '@capacitor/core'
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'

/**
 * Daymark tactile vocabulary.
 *
 * Real Android haptics use @capacitor/haptics, not a guessed global bridge.
 * A phone's hardware, Android settings and user preferences control actual
 * physical amplitude. The preset names are relative, not exact motor power.
 *
 * Haptics must never gate a user action or require a network connection.
 */
export const HAPTIC_LEVELS = Object.freeze(['off', 'subtle', 'balanced', 'strong'])

export function normalizeHapticLevel(value) {
  return HAPTIC_LEVELS.includes(value) ? value : 'balanced'
}

const IMPACT_BY_LEVEL = Object.freeze({
  subtle:   { selection: ImpactStyle.Light,  action: ImpactStyle.Light,  complete: ImpactStyle.Light },
  balanced: { selection: ImpactStyle.Light,  action: ImpactStyle.Medium, complete: ImpactStyle.Medium },
  strong:   { selection: ImpactStyle.Medium, action: ImpactStyle.Heavy,  complete: ImpactStyle.Heavy },
})

const FALLBACK_PATTERNS = Object.freeze({
  selection: [8],
  action: [16],
  success: [14, 35, 22],
  complete: [18, 36, 30],
  warning: [24, 42, 20],
  error: [20, 32, 20, 32, 25],
})

export function vibrationPattern(kind, level = 'balanced') {
  const preset = normalizeHapticLevel(level)
  if (preset === 'off') return []
  const timings = FALLBACK_PATTERNS[kind] || FALLBACK_PATTERNS.selection
  const multiplier = preset === 'subtle' ? .65 : preset === 'strong' ? 1.35 : 1
  return timings.map((value, index) => index % 2 === 1 ? value : Math.max(1, Math.round(value * multiplier)))
}

/**
 * Driver injection makes logic testable without calling a real vibration
 * motor. Do not use this option from application components.
 */
export async function hapticFeedback(kind = 'selection', level = 'balanced', options = {}) {
  const preset = normalizeHapticLevel(level)
  if (preset === 'off') return false

  const { nativePlatform = Capacitor.isNativePlatform(),
    driver = Haptics,
    visibilityState = typeof document === 'undefined' ? 'visible' : document.visibilityState,
    vibrate = typeof navigator === 'undefined' ? null : navigator.vibrate?.bind(navigator) } = options

  if (visibilityState === 'hidden') return false

  if (nativePlatform) {
    try {
      if (kind === 'complete') {
        // A distinctive two-part completion pulse, subtle mode remains one tick.
        await driver.impact({ style: IMPACT_BY_LEVEL[preset].complete })
        if (preset !== 'subtle') await driver.notification({ type: NotificationType.Success })
        return true
      }
      if (kind === 'success') {
        await driver.notification({ type: NotificationType.Success })
        return true
      }
      if (kind === 'warning') {
        await driver.notification({ type: NotificationType.Warning })
        return true
      }
      if (kind === 'error') {
        await driver.notification({ type: NotificationType.Error })
        return true
      }
      await driver.impact({ style: IMPACT_BY_LEVEL[preset][kind] || IMPACT_BY_LEVEL[preset].selection })
      return true
    } catch {
      // A missing native implementation must never block CRUD interactions.
    }
  }

  // Browser vibration is optional; desktop browsers usually do not support it.
  if (typeof vibrate === 'function') {
    try { return Boolean(vibrate(vibrationPattern(kind, preset))) } catch { return false }
  }
  return false
}
