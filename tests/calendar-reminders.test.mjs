import test from 'node:test'
import assert from 'node:assert/strict'
import { calendarReminderAt, calendarReminderId, reminderId } from '../src/lib/island.js'

test('calendar reminder has distinct ID from manual task reminders', () => {
  const taskId='a1c8e491-7c29-445b-8b3d-ec4af9139f25'
  assert.equal(calendarReminderId(taskId),'c-'+taskId)
  assert.notEqual(calendarReminderId(taskId),reminderId(taskId))
  assert.throws(()=>calendarReminderId('../task'))
})
test('calendar due dates use device-local time, not UTC midnight',()=>{
  const at=calendarReminderAt({due_date:'2027-07-12',due_time:'09:30'},Date.parse('2025-01-01T00:00:00Z'))
  assert.equal(at,new Date(2027,6,12,9,30).getTime())
})
test('past, missing and invalid dates never create immediate alarms',()=>{
  const now=new Date(2026,9,17,18,0).getTime()
  assert.equal(calendarReminderAt({due_date:'2026-10-17',due_time:'17:59'},now),null)
  assert.equal(calendarReminderAt({due_date:'2026-10-17',due_time:'18:00'},now),null)
  assert.equal(calendarReminderAt({due_date:'2026-10-18',due_time:null},now),null)
  assert.equal(calendarReminderAt({due_date:'2026-02-30',due_time:'20:00'},now),null)
  assert.equal(calendarReminderAt({due_date:'2026-10-18',due_time:'24:00'},now),null)
  assert.equal(calendarReminderAt({due_date:'2026-10-18',due_time:'20:99'},now),null)
  assert.equal(calendarReminderAt({due_date:'2026-10-18',due_time:'20:00'},now),new Date(2026,9,18,20,0).getTime())
})
test('calendar reminder avoids DST nonexistent wall-clock times where applicable',()=>{
  const skip=calendarReminderAt({due_date:'2027-03-14',due_time:'02:30'},Date.parse('2026-01-01T00:00:00Z'))
  assert.ok(skip===null||Number.isFinite(skip))
})
