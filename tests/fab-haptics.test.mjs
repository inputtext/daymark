import test from 'node:test'
import assert from 'node:assert/strict'
import { fabGesture } from '../src/lib/notes.js'
import { hapticFeedback } from '../src/lib/haptics.js'

test('FAB swipe left reaches quick note without an accidental button toggle',()=>{
  assert.equal(fabGesture(-80,-10),'quick-note')
  assert.equal(fabGesture(-65,4),'quick-note')
  assert.equal(fabGesture(0,-70),'expand')
  assert.equal(fabGesture(-12,-15),'tap')
  assert.equal(fabGesture(7,1),'tap')
})

test('menu haptics are tuned native-only and honor Off',async()=>{
  const invoked=[]
  const driver={play:async ({kind,level})=>{invoked.push({kind,level});return {played:true}}}
  const opts={platform:'android',visibilityState:'visible',driver}
  assert.equal(await hapticFeedback('selection','balanced',opts),true)
  assert.equal(await hapticFeedback('action','balanced',opts),true)
  assert.deepEqual(invoked,[{kind:'selection',level:'balanced'},{kind:'action',level:'balanced'}])
  assert.equal(await hapticFeedback('selection','off',opts),false)
  assert.equal(invoked.length,2)
  assert.equal(await hapticFeedback('action','strong',{...opts,visibilityState:'hidden'}),false)
  assert.equal(await hapticFeedback('selection','strong',{...opts,platform:'web'}),false)
})
