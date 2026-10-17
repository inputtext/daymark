import test from 'node:test'
import assert from 'node:assert/strict'
import { clockDialValue } from '../src/lib/calendar.js'
import { hapticFeedback } from '../src/lib/haptics.js'

const bounds = {left:0, top:0, width:200, height:200}
test('Pixel time dial maps all four cardinal directions to hours', () => {
  assert.equal(clockDialValue(100,18,bounds,'hour'),12)
  assert.equal(clockDialValue(182,100,bounds,'hour'),3)
  assert.equal(clockDialValue(100,182,bounds,'hour'),6)
  assert.equal(clockDialValue(18,100,bounds,'hour'),9)
})
test('Pixel time dial maps minute increments and handles wrapping', () => {
  assert.equal(clockDialValue(100,18,bounds,'minute'),0)
  assert.equal(clockDialValue(182,100,bounds,'minute'),15)
  assert.equal(clockDialValue(100,182,bounds,'minute'),30)
  assert.equal(clockDialValue(18,100,bounds,'minute'),45)
  assert.equal(clockDialValue(100,100,bounds,'minute'),null)
  assert.equal(clockDialValue(NaN,100,bounds,'hour'),null)
})
test('time picker selection haptics never bypass the Off setting', async () => {
  const seen=[]
  const driver={async play(payload){seen.push(payload);return {played:true}}}
  assert.equal(await hapticFeedback('selection','off',{platform:'android',visibilityState:'visible',driver}),false)
  assert.equal(seen.length,0)
  assert.equal(await hapticFeedback('selection','balanced',{platform:'android',visibilityState:'visible',driver}),true)
  assert.deepEqual(seen[0],{kind:'selection',level:'balanced'})
  assert.equal(await hapticFeedback('action','subtle',{platform:'android',visibilityState:'visible',driver}),true)
  assert.deepEqual(seen[1],{kind:'action',level:'subtle'})
})
test('calendar haptics remain Android-only and respect document visibility', async () => {
  const seen=[]
  const driver={async play(payload){seen.push(payload);return {played:true}}}
  assert.equal(await hapticFeedback('selection','balanced',{platform:'web',visibilityState:'visible',driver}),false)
  assert.equal(await hapticFeedback('selection','balanced',{platform:'android',visibilityState:'hidden',driver}),false)
  assert.equal(seen.length,0)
})
