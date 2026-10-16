import test from 'node:test'
import assert from 'node:assert/strict'
import { hapticFeedback, normalizeHapticLevel, vibrationPattern } from '../src/lib/haptics.js'

test('haptic levels are validated', () => {
  assert.equal(normalizeHapticLevel('off'), 'off')
  assert.equal(normalizeHapticLevel('strong'), 'strong')
  assert.equal(normalizeHapticLevel('bogus'), 'balanced')
  assert.equal(normalizeHapticLevel(null), 'balanced')
})

test('browser fallback uses scaled distinct patterns', () => {
  assert.deepEqual(vibrationPattern('action', 'off'), [])
  assert.ok(vibrationPattern('complete', 'strong')[0] > vibrationPattern('complete', 'balanced')[0])
  assert.ok(vibrationPattern('complete', 'balanced')[0] > vibrationPattern('complete', 'subtle')[0])
  assert.notDeepEqual(vibrationPattern('error'), vibrationPattern('success'))
})

test('native Pixel feedback goes through direct Capacitor plugin driver', async () => {
  const events = []
  const driver = {
    impact: async options => events.push(['impact', options.style]),
    notification: async options => events.push(['notification', options.type]),
  }
  assert.equal(await hapticFeedback('selection', 'balanced', {nativePlatform:true,driver}), true)
  assert.equal(await hapticFeedback('action', 'strong', {nativePlatform:true,driver}), true)
  assert.equal(await hapticFeedback('complete', 'strong', {nativePlatform:true,driver}), true)
  assert.deepEqual(events, [
    ['impact', 'LIGHT'], ['impact','HEAVY'], ['impact','HEAVY'],
    ['notification','SUCCESS'],
  ])
})

test('completion in subtle mode produces a single tick', async () => {
  const events = []
  const driver = {
    impact: async options => events.push(options.style),
    notification: async () => events.push('notification'),
  }
  await hapticFeedback('complete', 'subtle', {nativePlatform:true,driver})
  assert.deepEqual(events, ['LIGHT'])
})

test('success, warning, error use distinct system notification patterns', async () => {
  const actual = []
  const driver = {notification: async ({type}) => actual.push(type)}
  for (const kind of ['success','warning','error'])
    assert.equal(await hapticFeedback(kind, 'balanced', {nativePlatform:true,driver}),true)
  assert.deepEqual(actual, ['SUCCESS','WARNING','ERROR'])
})

test('browser fallback works when supported', async () => {
  let played = null
  const status = await hapticFeedback('warning','strong',{
    nativePlatform:false,vibrate:pattern => {played = pattern;return true},
  })
  assert.equal(status,true)
  assert.deepEqual(played,vibrationPattern('warning','strong'))
})

test('no vibration when backgrounded or turned off', async () => {
  let hits = 0
  const options = {nativePlatform:false,vibrate:() => {hits++;return true}}
  assert.equal(await hapticFeedback('selection','off',options),false)
  assert.equal(await hapticFeedback('error','strong',{...options,visibilityState:'hidden'}),false)
  assert.equal(hits,0)
})

test('missing or failing driver is a safe no-op', async () => {
  assert.equal(await hapticFeedback('success','balanced',{nativePlatform:false,vibrate:null}),false)
  const driver = {impact:async () => {throw new Error('unavailable')}}
  assert.equal(await hapticFeedback('selection','balanced',{nativePlatform:true,driver,vibrate:null}),false)
})
