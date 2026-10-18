import { addLocalDays, localISO, parseLocalDay, timeLabel } from './calendar.js'

/** Fully offline English quick-entry parser. No AI service, clock/network calls
 * other than the injected local time. Only remove phrases we can interpret
 * unambiguously; unsupported instructions must never be silently accepted.
 */
const WEEKDAYS=['sunday','monday','tuesday','wednesday','thursday','friday','saturday']
const MONTHS=['january','february','march','april','may','june','july','august','september','october','november','december']
const MONTH_ALIASES=Object.fromEntries(MONTHS.flatMap((name,i)=>[[name,i],[name.slice(0,3),i]]))
const rx=(pattern,flags='i')=>new RegExp(pattern,flags)
const bounded=(pattern)=>rx('(?:^|\\s)('+pattern+')(?=$|[\\s,.!?])')
const PAST_HINT='That time has passed. You can save the task, but it will not schedule a notification.'

const noon=(date)=>new Date(date.getFullYear(),date.getMonth(),date.getDate(),12)
const dateFromParts=(year,month,date)=>{
  const candidate=new Date(year,month,date,12)
  return candidate.getFullYear()===year && candidate.getMonth()===month &&
    candidate.getDate()===date ? localISO(candidate) : null
}
const tidy=s=>s.replace(/\s+/g,' ').replace(/\s+([,.?])/g,'$1')
  .replace(/^[,.\s!?]+|[,.\s!?]+$/g,'').trim()
function consume(original,match){
  return tidy(original.slice(0,match.index)+' '+original.slice(match.index+match[0].length))
}
const capture=(value,pattern)=>{
  const match=pattern.exec(value)
  return match ? {match,text:consume(value,match)} : null
}
const localAt=(iso,time)=>{
  if(!parseLocalDay(iso)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))return null
  const [h,m]=time.split(':').map(Number)
  const [y,mo,d]=iso.split('-').map(Number)
  const at=new Date(y,mo-1,d,h,m)
  return at.getFullYear()===y&&at.getMonth()===mo-1&&at.getDate()===d &&
    at.getHours()===h&&at.getMinutes()===m ? at : null
}
export function quickAddReminderPreview(date,time,{now=new Date()}={}){
  const at=localAt(date,time)
  if(!at)return {valid:false,label:'Choose a valid date and time',at:null}
  if(at.getTime()<=now.getTime()+5000)return {valid:false,label:PAST_HINT,at:null}
  return {valid:true,label:at.toLocaleString('en-US',{weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}),at:at.getTime()}
}

function detectDate(text,now){
  // Calendar ISO avoids US/Indian ambiguous numeric date formats.
  let hit=capture(text,/\b(?:on\s+)?(\d{4})-(\d{2})-(\d{2})\b/i)
  if(hit){
    const [y,m,d]=hit.match.slice(1,4).map(Number)
    const day=dateFromParts(y,m-1,d)
    if(day)return {text:hit.text,date:day,kind:'date'}
  }
  // "on 28 October", "Oct 28", optionally with year.
  hit=capture(text,/\b(?:on\s+)?(\d{1,2})(?:st|nd|rd|th)?\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)(?:\s+(\d{4}))?\b/i)
  let day=null
  if(hit){
    const m=MONTH_ALIASES[hit.match[2].toLowerCase().slice(0,3)]
    let y=hit.match[3]?Number(hit.match[3]):now.getFullYear()
    day=dateFromParts(y,m,Number(hit.match[1]))
    if(day&&!hit.match[3]&&day<localISO(now))day=dateFromParts(y+1,m,Number(hit.match[1]))
    if(day)return {text:hit.text,date:day,kind:'date'}
  }
  hit=capture(text,/\b(?:on\s+)?(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?\b/i)
  if(hit){
    const m=MONTH_ALIASES[hit.match[1].toLowerCase().slice(0,3)]
    let y=hit.match[3]?Number(hit.match[3]):now.getFullYear()
    day=dateFromParts(y,m,Number(hit.match[2]))
    if(day&&!hit.match[3]&&day<localISO(now))day=dateFromParts(y+1,m,Number(hit.match[2]))
    if(day)return {text:hit.text,date:day,kind:'date'}
  }
  hit=capture(text,/\bin\s+(\d{1,3})\s+days?\b/i)
  if(hit){
    const n=Number(hit.match[1])
    if(n>0&&n<=365)return {text:hit.text,date:addLocalDays(localISO(now),n),kind:'relative'}
  }
  hit=capture(text,/\bnext\s+week\b/i)
  if(hit)return {text:hit.text,date:addLocalDays(localISO(now),7),kind:'relative'}
  hit=capture(text,/\b(tomorrow|today|tonight)\b/i)
  if(hit)return {text:hit.text,date:addLocalDays(localISO(now),hit.match[1].toLowerCase()==='tomorrow'?1:0),kind:hit.match[1].toLowerCase()}
  hit=capture(text,/\b(?:(this|next)\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i)
  if(hit){
    const wanted=WEEKDAYS.indexOf(hit.match[2].toLowerCase())
    let offset=(wanted-now.getDay()+7)%7
    if(hit.match[1]?.toLowerCase()==='next')offset=offset===0?7:offset+7
    // "Friday" today means today; "next Friday" means the following week.
    return {text:hit.text,date:addLocalDays(localISO(now),offset),kind:'weekday'}
  }
  return null
}
function detectTime(text){
  let hit=capture(text,/\b(?:at\s+)?(1[0-2]|0?[1-9])(?::([0-5]\d))?\s*(a\.?m\.?|p\.?m\.?)\b/i)
  if(hit){
    let hour=Number(hit.match[1])%12
    if(/^p/i.test(hit.match[3]))hour+=12
    return {text:hit.text,time:String(hour).padStart(2,'0')+':'+(hit.match[2]??'00'),kind:'explicit'}
  }
  hit=capture(text,/\bat\s+([01]?\d|2[0-3]):([0-5]\d)\b/i)
  if(hit)return {text:hit.text,time:hit.match[1].padStart(2,'0')+':'+hit.match[2],kind:'explicit'}
  hit=capture(text,/\b(morning|afternoon|evening|night)\b/i)
  if(hit){
    const h={morning:'09:00',afternoon:'15:00',evening:'18:00',night:'20:00'}
    return {text:hit.text,time:h[hit.match[1].toLowerCase()],kind:'daypart'}
  }
  return null
}

/** Returns editable suggestions; no schedules or storage are modified.
 * Repeats and early reminders are flagged rather than silently scheduling
 * the wrong thing in the existing due-time reminder backend.
 */
export function parseQuickAdd(input,{now=new Date()}={}){
  const original=String(input??'').slice(0,500)
  let title=tidy(original),due_date=null,due_time=null,priority='medium'
  const detected=[]
  const issues=[]
  if(/\b(?:every\s+(?:day|week|month|year|monday|tuesday|wednesday|thursday|friday|saturday|sunday)|daily|weekly|monthly)\b/i.test(title)){
    issues.push('Repeating tasks are not supported by Quick Add yet. Remove the repeat phrase and create a one-time task.')
  }
  if(/\b(?:remind(?:\s+me)?\s+)?\d+\s*(?:min(?:ute)?s?|hours?|days?)\s+before\b/i.test(title)){
    issues.push('Early reminders are not supported yet. Remove the “before” instruction; reminders can fire at the due time.')
  }
  let result=capture(title,/(?:^|\s)(!high|!medium|!low|urgent|high priority|low priority)(?=$|[\s,.!?])/i)
  if(result){
    const val=result.match[1].toLowerCase()
    priority=val.includes('high')||val==='urgent'?'high':val.includes('low')?'low':'medium'
    title=result.text;detected.push('priority')
  }
  const time=detectTime(title)
  if(time){due_time=time.time;title=time.text;detected.push('time')}
  const date=detectDate(title,now)
  if(date){due_date=date.date;title=date.text;detected.push('date')}
  // Handles "tonight" as date+time when it wasn't already consumed.
  if(!due_date){
    result=capture(title,/\btonight\b/i)
    if(result){due_date=localISO(now);title=result.text;detected.push('date');if(!due_time){due_time='20:00';detected.push('time')}}
  }
  if(!due_date && time?.kind==='daypart'){
    due_date=localISO(now)
    title=tidy(title.replace(/^this\s*$/i,''))
    detected.push('date')
  }
  if(!due_time && date?.kind==='tonight'){due_time='20:00';detected.push('time')}
  result=capture(title,/\bremind\s+me(?:\s+to)?(?:\s+at\s+due\s+time)?\b/i)
  if(result&&due_date&&due_time){title=result.text;detected.push('reminder')}
  if(due_time&&!due_date){issues.push('Choose a date to use the detected time.')}
  title=tidy(title)
  const preview=due_date&&due_time?quickAddReminderPreview(due_date,due_time,{now}):null
  return {
    title,due_date,due_time,priority,
    detected,issues,
    reminderSuggested:Boolean(preview?.valid && (detected.includes('reminder')||detected.includes('time'))),
    preview,
    hasSuggestions:detected.length>0,
    label:due_time?timeLabel(due_time):'',
  }
}
