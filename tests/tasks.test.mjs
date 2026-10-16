import test from 'node:test'
import assert from 'node:assert/strict'
import { dateISO, shiftDate, filterTasks, getStats, getDueLabel, createDemoTasks } from '../src/lib/tasks.js'

test('local dates are ISO and shifting produces a valid ISO date', () => {
  assert.match(dateISO(), /^\d{4}-\d{2}-\d{2}$/)
  assert.match(shiftDate(1), /^\d{4}-\d{2}-\d{2}$/)
})

test('inbox, today, upcoming, completed respect status and dates', () => {
  const today = '2026-10-16'
  const tasks = [
    {title:'Past', notes:'', priority:'high', due_date:'2026-10-15', is_complete:false},
    {title:'Next', notes:'', priority:'low', due_date:'2026-10-17', is_complete:false},
    {title:'Done', notes:'', priority:'high', due_date:today, is_complete:true},
    {title:'No date', notes:'', priority:'medium', due_date:null, is_complete:false},
  ]
  assert.equal(filterTasks(tasks, {view:'today',today}).length, 1)
  assert.equal(filterTasks(tasks, {view:'upcoming',today}).length, 1)
  assert.equal(filterTasks(tasks, {view:'completed',today}).length, 1)
  assert.equal(filterTasks(tasks, {view:'inbox',today}).length, 4)
  assert.deepEqual(getStats(tasks,today), {all:4,completed:1,active:3,today:1,upcoming:1,doneToday:0})
})

test('search uses notes and priority filter', () => {
  const tasks = [
    {title:'Buy milk',notes:'for dinner',priority:'low',is_complete:false},
    {title:'Plan',notes:'urgent dinner',priority:'high',is_complete:false},
  ]
  assert.deepEqual(filterTasks(tasks,{query:'dinner',priority:'high'}).map(t=>t.title),['Plan'])
})

test('date labels and demo seed work', () => {
  assert.equal(getDueLabel('2026-10-15','2026-10-16'),'Overdue')
  assert.equal(getDueLabel('2026-10-16','2026-10-16'),'Today')
  assert.equal(getDueLabel('2026-10-17','2026-10-16'),'Tomorrow')
  assert.equal(createDemoTasks().length, 8)
})
