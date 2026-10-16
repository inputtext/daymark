import test from 'node:test'
import assert from 'node:assert/strict'
import { hapticFeedback, normalizeHapticLevel, normalizeHapticKind } from '../src/lib/haptics.js'

test('validates preferences, defaults to balanced', () => {
  assert.equal(normalizeHapticLevel('subtle'), 'subtle')
  assert.equal(normalizeHapticLevel('strong'), 'strong')
  assert.equal(normalizeHapticLevel('none'), 'balanced')
  assert.equal(normalizeHapticKind('complete'), 'complete')
  assert.equal(normalizeHapticKind('invalid'), 'selection')
})

test('direct native plugin receives the event and intensity', async () => {
  const seen = []
  const driver = { play: async opts => { seen.push(opts); return {played:true} } }
  assert.equal(await hapticFeedback('complete','strong',{platform:'android',driver}),true)
  assert.equal(await hapticFeedback('selection','subtle',{platform:'android',driver}),true)
  assert.deepEqual(seen,[{kind:'complete',level:'strong'},{kind:'selection',level:'subtle'}])
})

test('off is truly silent even on native Android',async()=>{
  let attempts=0
  const driver={play:async()=>{attempts++;return {played:true}}}
  assert.equal(await hapticFeedback('action','off',{platform:'android',driver}),false)
  assert.equal(attempts,0)
})

test('browser is quiet rather than using buzzy navigator vibration',async()=>{
  let attempts=0
  const driver={play:async()=>{attempts++;return {played:true}}}
  for(const platform of ['web','ios']) {
    assert.equal(await hapticFeedback('error','strong',{platform,driver}),false)
  }
  assert.equal(attempts,0)
})

test('backgrounded app never vibrates',async()=>{
  let attempts=0
  const driver={play:async()=>{attempts++;return {played:true}}}
  assert.equal(await hapticFeedback('selection','balanced',{platform:'android',visibilityState:'hidden',driver}),false)
  assert.equal(attempts,0)
})

test('missing/unavailable native plugin and system-off return safely',async()=>{
  assert.equal(await hapticFeedback('action','balanced',{platform:'android',driver:{play:async()=>{throw Error('unavailable')}}}),false)
  assert.equal(await hapticFeedback('action','strong',{platform:'android',driver:{play:async()=>({played:false})}}),false)
})

test('invalid events use a safe selection fallback',async()=>{
  let kind
  const driver={play:async opts=>{kind=opts.kind;return {played:true}}}
  await hapticFeedback('mystery','balanced',{platform:'android',driver})
  assert.equal(kind,'selection')
})
