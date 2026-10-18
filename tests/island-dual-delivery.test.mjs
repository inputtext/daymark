import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const reminders=source('android/app/src/main/java/com/piyush/daymark/IslandReminders.java')
const receiver=source('android/app/src/main/java/com/piyush/daymark/IslandReminderReceiver.java')
const service=source('android/app/src/main/java/com/piyush/daymark/DaymarkIslandService.java')
const plugin=source('android/app/src/main/java/com/piyush/daymark/DaymarkIslandPlugin.java')
const settings=source('src/components/IslandSettings.jsx')
const oldMotion=source('android/app/src/main/java/com/piyush/daymark/IslandMotion.java')

test('normal notification is always posted first and the Island is a separate best-effort attempt',()=>{
  assert.match(receiver,/boolean notificationPosted = IslandReminders\.notifyDue\(context, id, title\);/)
  assert.match(receiver,/IslandReminders\.recordDelivery\(context,[\s\S]*?showIsland\(context, id, title, false\)/)
  assert.match(receiver,/if \(!IslandReminders\.enabled\(context\)\)/)
  assert.match(receiver,/if \(!Settings\.canDrawOverlays\(context\)\)/)
  assert.match(receiver,/lock\.isDeviceLocked\(\)/)
  assert.match(receiver,/startForegroundService\(overlay\)/)
  assert.match(receiver,/catch \(RuntimeException restricted\)/)
})

test('manual Show Island action appears only with opt-in and permission and retains snooze/open',()=>{
  assert.match(reminders,/ACTION_SHOW_ISLAND = "com\.piyush\.daymark\.island\.SHOW_FROM_NOTIFICATION"/)
  assert.match(reminders,/if \(enabled\(context\) && Settings\.canDrawOverlays\(context\)\)/)
  assert.match(reminders,/PendingIntent\.getBroadcast\(context,[\s\S]*?ACTION_SHOW_ISLAND[\s\S]*?FLAG_IMMUTABLE/)
  assert.match(reminders,/builder\.addAction\(android\.R\.drawable\.ic_menu_view, "Show Island", showIsland\)/)
  assert.match(reminders,/"Snooze 10 min"/)
  assert.match(reminders,/"Open Daymark"/)
  assert.match(reminders,/\.setContentIntent\(openApp\(context, id\)\)/)
  assert.match(receiver,/if \(IslandReminders\.ACTION_SHOW_ISLAND\.equals\(action\)\)/)
  assert.match(receiver,/showIsland\(context, id, IslandReminders\.cleanTitle\(intent\.getStringExtra\("title"\)\), true\)/)
  assert.match(receiver,/context\.startForegroundService\(overlay\)/)
})

test('native diagnostic reports actual displayed overlay or blocked service, not just request',()=>{
  assert.match(service,/showOverlay\(currentTitle\);[\s\S]*?recordOverlay\(this, "Floating Island displayed successfully"\)/)
  assert.match(service,/Floating Island failed to display/)
  assert.match(receiver,/blocked by Android/)
  assert.match(reminders,/putLong\("lastOverlayAt", System\.currentTimeMillis\(\)\)/)
  assert.match(plugin,/state\.put\("lastOverlayAt", IslandReminders\.lastOverlayAt\(getContext\(\)\)\)/)
  assert.match(settings,/Last Island status/)
  assert.match(settings,/status\?\.lastOverlayAt/)
})
test('animation profiles remain intact and reminder schedule is still inexact',()=>{
  for(const mode of ['SPRING','BLOOM','ELASTIC','GLIDE'])assert.match(oldMotion,new RegExp('static final String '+mode))
  assert.match(reminders,/manager\.setAndAllowWhileIdle\(AlarmManager\.RTC_WAKEUP, at, operation\)/)
  assert.doesNotMatch(reminders,/SCHEDULE_EXACT_ALARM/)
  assert.match(settings,/Normal notification \+ floating Island/)
  assert.match(settings,/tap Show Island/)
  assert.match(settings,/Preview Island/)
})
