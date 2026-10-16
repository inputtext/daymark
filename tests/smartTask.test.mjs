import test from 'node:test'
import assert from 'node:assert/strict'
import { parseSmartTask } from '../src/lib/smartTask.js'

const now = new Date(2026, 9, 16, 14, 30)
const parse = input => parseSmartTask(input, { now })

test('extracts tomorrow and explicit high priority without API calls', () => {
  assert.deepEqual(parse('Submit OS assignment tomorrow !HIGH'), {
    title: 'Submit OS assignment',
    due_date: '2026-10-17',
    priority: 'high',
    hasSuggestions: true,
  })
})

test('supports today, next week and a relative number of days', () => {
  assert.equal(parse('Pay rent today').due_date, '2026-10-16')
  assert.equal(parse('Prepare slides next week').due_date, '2026-10-23')
  assert.equal(parse('Check again in 3 days').due_date, '2026-10-19')
})

test('handles month boundaries using local calendar arithmetic', () => {
  const endOfMonth = new Date(2026, 9, 31, 23, 0)
  assert.equal(parseSmartTask('Plan tomorrow', { now: endOfMonth }).due_date, '2026-11-01')
})

test('leaves ordinary text and unrelated hashtags untouched', () => {
  assert.deepEqual(parse('Research tomorrowland #uni'), {
    title: 'Research tomorrowland #uni',
    due_date: null,
    priority: null,
    hasSuggestions: false,
  })
  assert.equal(parse('Read #college !low').title, 'Read #college')
})

test('does not extract unsupported times, dates or priority words', () => {
  assert.equal(parse('Meet at 5pm').hasSuggestions, false)
  assert.equal(parse('Highly important').hasSuggestions, false)
  assert.equal(parse('Submit in 999 days').hasSuggestions, false)
})

test('will not suggest changes that would leave an empty title', () => {
  assert.equal(parse('tomorrow !high').hasSuggestions, false)
  assert.equal(parse('   ').hasSuggestions, false)
})

test('supports punctuation and preserves unrelated text', () => {
  const result = parse('Review report, tomorrow! !medium')
  assert.equal(result.due_date, '2026-10-17')
  assert.equal(result.priority, 'medium')
  assert.equal(result.title, 'Review report')
})
