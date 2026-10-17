import test from 'node:test'
import assert from 'node:assert/strict'
import {reminderId, cleanReminderTitle, reminderTime, islandStatus} from '../src/lib/island.js'

test('reminder IDs remain stable and valid for task and demo IDs', () => {
  assert.equal(reminderId('demo-1'), 't-demo-1')
  assert.equal(reminderId('63f0dcf4-3b6e-42d5-bde6-5c5fe1c8f27e'),
    't-63f0dcf4-3b6e-42d5-bde6-5c5fe1c8f27e')
  assert.throws(() => reminderId('../unsafe'))
  assert.throws(() => reminderId(''))
})
test('display text is bounded and defaults when empty', () => {
  assert.equal(cleanReminderTitle('  Read notes  '), 'Read notes')
  assert.equal(cleanReminderTitle('   '), 'Your Daymark reminder')
  assert.equal(cleanReminderTitle('x'.repeat(300)).length, 120)
})
test('reminder times are future-only, no exact delivery guarantees', () => {
  assert.equal(reminderTime(1, 1000), 61000)
  assert.equal(reminderTime(60, 1000), 3601000)
  for (const value of [0,-1,1.5,1441,Infinity,NaN]) assert.throws(() => reminderTime(value))
})
test('the browser does not impersonate Android overlay APIs', async () => {
  const status = await islandStatus()
  assert.equal(status.supported, false)
  assert.equal(status.enabled, false)
})
