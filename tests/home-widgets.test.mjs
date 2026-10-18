import test from 'node:test'
import assert from 'node:assert/strict'
import { makeWidgetSnapshot, localDay } from '../src/lib/homeWidgets.js'

test('widget snapshot includes only safe task fields', () => {
  const data = JSON.parse(makeWidgetSnapshot([{
    id: 'private-id', user_id:'secret',title:'  Call team  ',notes:'private note',
    due_date:'2026-10-19', due_time:'09:30', priority:'high', is_complete:false,
    access_token:'do-not-leak',
  }], new Date(2026,9,18)))
  assert.equal(data.version, 1)
  assert.equal(data.tasks.length, 1)
  assert.deepEqual(data.tasks[0], {
    title:'Call team', due_date:'2026-10-19', due_time:'09:30',
    is_complete:false,completed_on:'',
  })
  assert.equal(JSON.stringify(data).includes('private'), false)
  assert.equal(JSON.stringify(data).includes('secret'), false)
})

test('completed-on timestamp uses the local calendar date', () => {
  const timestamp = '2026-10-18T17:00:00.000Z'
  const expected = localDay(new Date(timestamp))
  const {tasks} = JSON.parse(makeWidgetSnapshot([{
    title:'Finish QA', is_complete:true, updated_at:timestamp,
  }]))
  assert.equal(tasks[0].completed_on, expected)
})

test('bad dates and times are removed and titles capped', () => {
  const {tasks} = JSON.parse(makeWidgetSnapshot([{
    title:'x'.repeat(200), due_date:'tomorrow',due_time:'25:80',is_complete:false,
  }]))
  assert.equal(tasks[0].title.length,120)
  assert.equal(tasks[0].due_date,'')
  assert.equal(tasks[0].due_time,'')
})

test('handles non-array and empty snapshots safely', () => {
  assert.deepEqual(JSON.parse(makeWidgetSnapshot(null)).tasks, [])
  assert.deepEqual(JSON.parse(makeWidgetSnapshot([])).tasks, [])
})
