import test from 'node:test'
import assert from 'node:assert/strict'
import {calendarSwipeDecision,CALENDAR_REVEAL_OFFSET} from '../src/lib/calendarGestures.js'

test('Calendar horizontal swipe only reveals actions and never deletes',()=>{
  assert.equal(calendarSwipeDecision(-88,0),'reveal')
  assert.equal(calendarSwipeDecision(-66,0),'reveal')
  assert.equal(calendarSwipeDecision(-45,-500),'reveal')
  assert.equal(calendarSwipeDecision(-45,-120),'close')
  assert.equal(calendarSwipeDecision(80,900),'close')
  assert.equal(calendarSwipeDecision(0,0),'close')
  assert.equal(CALENDAR_REVEAL_OFFSET,-110)
})
test('Calendar swipe rejects invalid motion data and short movements',()=>{
  assert.equal(calendarSwipeDecision(Number.NaN,0),'close')
  assert.equal(calendarSwipeDecision(-15,-100),'close')
  assert.equal(calendarSwipeDecision(-90,Number.NaN),'close')
})
