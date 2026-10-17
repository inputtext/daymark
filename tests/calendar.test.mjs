import test from 'node:test'
import assert from 'node:assert/strict'
import {parseLocalDay,localISO,addLocalDays,monthDates,weekDates,shiftMonth,monthStart,timeLabel,sortedDayTasks} from '../src/lib/calendar.js'

test('calendar local dates do not drift across month and year boundaries',()=>{
 assert.equal(addLocalDays('2026-12-31',1),'2027-01-01')
 assert.equal(addLocalDays('2026-03-01',-1),'2026-02-28')
 assert.equal(addLocalDays('2028-03-01',-1),'2028-02-29')
 assert.equal(shiftMonth('2026-12-01',1),'2027-01-01')
 assert.equal(monthStart('2026-10-17'),'2026-10-01')
})
test('calendar rejects invalid dates and shows aligned weeks',()=>{
 assert.equal(parseLocalDay('2026-02-30'),null)
 assert.equal(parseLocalDay('2026-10-17') instanceof Date,true)
 const month=monthDates('2026-10-17')
 assert.equal(month.length%7,0)
 assert.equal(month[0],'2026-09-27')
 assert.equal(weekDates('2026-10-17')[0],'2026-10-11')
 assert.equal(localISO(parseLocalDay('2026-10-17')),'2026-10-17')
})
test('time display and chronological timeline order',()=>{
 assert.equal(timeLabel('00:05'),'12:05 AM')
 assert.equal(timeLabel('13:45'),'1:45 PM')
 assert.equal(timeLabel('24:01'),'')
 const tasks=[{title:'Anytime',due_time:null},{title:'Lunch',due_time:'12:30'},{title:'Morning',due_time:'09:00'}]
 assert.deepEqual(sortedDayTasks(tasks).map(x=>x.title),['Morning','Lunch','Anytime'])
})
