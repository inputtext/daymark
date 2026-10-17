/** Calendar timeline gestures are deliberately non-destructive.
 * Left swipe reveals Edit/Delete, short drags settle back. A swipe never deletes.
 */
export const CALENDAR_REVEAL_OFFSET = -110
export function calendarSwipeDecision(offset, velocity = 0) {
  if (!Number.isFinite(offset) || !Number.isFinite(velocity)) return 'close'
  if (offset <= -66 || (offset < -30 && velocity < -420)) return 'reveal'
  return 'close'
}
