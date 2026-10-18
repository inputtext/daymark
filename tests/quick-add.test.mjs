import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {parseQuickAdd,quickAddReminderPreview} from '../src/lib/quickAdd.js'

const ref=new Date(2026,9,18,12,0,0) // Sunday, date constructor uses local time.
const parse=text=>parseQuickAdd(text,{now:ref})
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')

test('quick add parses dates, times and title offline without changing saved tasks',()=>{
  assert.deepEqual(
    (({title,due_date,due_time,priority})=>({title,due_date,due_time,priority}))(
      parse('Submit assignment tomorrow at 9 AM')),
    {title:'Submit assignment',due_date:'2026-10-19',due_time:'09:00',priority:'medium'},
  )
  const a=parse('Call home tonight')
  assert.equal(a.title,'Call home')
  assert.equal(a.due_date,'2026-10-18')
  assert.equal(a.due_time,'20:00')
  assert.equal(parse('Finish project next Monday at 10 AM').due_date,'2026-10-26')
  assert.equal(parse('Gym Friday 7:15 PM').due_time,'19:15')
  assert.equal(parse('Project demo in 3 days !high').due_date,'2026-10-21')
  assert.equal(parse('Project demo in 3 days !high').priority,'high')
})
test('explicit dates and natural-language dayparts use local calendar, not UTC slicing',()=>{
  const a=parse('Meet team on 28 Oct at 19:30')
  assert.equal(a.due_date,'2026-10-28')
  assert.equal(a.due_time,'19:30')
  assert.equal(a.title,'Meet team')
  assert.equal(parse('Pay rent December 2 2026').due_date,'2026-12-02')
  assert.equal(parse('Renew on 2026-10-30').due_date,'2026-10-30')
  assert.equal(parse('Read tomorrow morning').due_date,'2026-10-19')
  assert.equal(parse('Read tomorrow morning').due_time,'09:00')
  assert.equal(parse('Write this evening').due_date,'2026-10-18')
  assert.equal(parse('Write this evening').due_time,'18:00')
})
test('natural language refuses ambiguous, invalid and unsupported scheduling',()=>{
  assert.equal(parse('Call someone at 9').due_time,null)
  assert.equal(parse('Homework on 31 February').due_date,null)
  assert.equal(parse('Plan in 999 days').due_date,null)
  assert.ok(parse('Gym every Monday 7 PM').issues.some(text=>text.includes('Repeating tasks')))
  assert.ok(parse('Submit tomorrow at 9 AM remind 30 min before').issues.some(text=>text.includes('Early reminders')))
  assert.equal(parse('Write a poem').hasSuggestions,false)
  assert.equal(parse('URGENT call mom tomorrow').priority,'high')
  assert.equal(parse('URGENT call mom tomorrow').title,'call mom')
})
test('future reminders are previews only, with past and DST-invalid times rejected',()=>{
  const future=quickAddReminderPreview('2026-10-19','09:00',{now:ref})
  assert.equal(future.valid,true)
  assert.ok(future.at>ref.getTime())
  assert.equal(quickAddReminderPreview('2026-10-17','09:00',{now:ref}).valid,false)
  assert.equal(quickAddReminderPreview('2026-02-30','09:00',{now:ref}).valid,false)
  assert.equal(quickAddReminderPreview('2026-10-19','27:00',{now:ref}).valid,false)
})
test('the new form uses the existing save and optional due-time reminder flow',()=>{
  const app=read('src/App.jsx'),component=read('src/components/SmartQuickAdd.jsx')
  assert.match(app,/import SmartQuickAdd from '\.\/components\/SmartQuickAdd\.jsx'/)
  assert.match(app,/onNewTask=\{openSmartAdd\}/)
  assert.match(app,/onSave=\{saveTask\} onMoreDetails=\{moveSmartToDetails\}/)
  assert.match(app,/setSmartComposerOpen\(false\)/)
  assert.match(app,/initialDraft=\{modal\.draft\}/)
  assert.match(component,/parseQuickAdd\(input/)
  assert.match(component,/quickAddReminderPreview/)
  assert.match(component,/remind_at_time:Boolean\(dueDate&&dueTime&&remind\)/)
  assert.match(component,/onSave\(\{/)
  assert.match(component,/role="dialog" aria-modal="true"/)
  assert.match(component,/role="alert"/)
})
test('animation respects reduced motion, labels and safe areas',()=>{
  const css=read('src/smart-quick-add.css')
  const component=read('src/components/SmartQuickAdd.jsx')
  assert.match(css,/max-height:calc\(100dvh - var\(--dm-inset-top,0px\) - 10px\)/)
  assert.match(css,/env\(safe-area-inset-bottom,0px\)/)
  assert.match(css,/prefers-reduced-motion:reduce/)
  assert.match(component,/reducedMotion\?\{duration:0\}:SHEET_SPRING/)
  assert.match(component,/aria-labelledby="smart-add-title"/)
  assert.match(component,/Parsed on your device/)
  assert.match(read('src/main.jsx'),/import '\.\/smart-quick-add\.css'/)
})
