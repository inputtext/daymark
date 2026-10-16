/**
 * Daymark touch thresholds and spring tuning; pure and regression-tested.
 * A right swipe completes (reversible). A left swipe only reveals explicit
 * edit/delete actions. No gesture ever automatically deletes data.
 */
export const SWIPE_COMPLETE_PX = 104
export const SWIPE_REVEAL_PX = 78
export const SWIPE_VELOCITY_PX_S = 750
export const LONG_PRESS_MS = 460
export const LONG_PRESS_SLOP_PX = 12
export const SPRING = Object.freeze({type:'spring',stiffness:470,damping:36,mass:0.85})

export function decideSwipe(x, velocity = 0) {
  if (!Number.isFinite(x) || !Number.isFinite(velocity)) return 'close'
  if (x >= SWIPE_COMPLETE_PX || (x >= 64 && velocity >= SWIPE_VELOCITY_PX_S)) return 'complete'
  if (x <= -SWIPE_REVEAL_PX || (x <= -46 && velocity <= -SWIPE_VELOCITY_PX_S)) return 'reveal'
  return 'close'
}
export function shouldCancelLongPress(dx, dy) {
  return Math.hypot(dx, dy) > LONG_PRESS_SLOP_PX
}
