import test from 'node:test'
import assert from 'node:assert/strict'
import {hapticFeedback,normalizeHapticLevel,vibrationPattern} from '../src/lib/haptics.js'

test('preferences are validated',()=>{
  assert.equal(normalizeHapticLevel('off'),'off')
  assert.equal(normalizeHapticLevel('strong'),'strong')
  assert.equal(normalizeHapticLevel('invalid'),'balanced')
})
test('levels scale action feedback while off is silent',()=>{
  assert.deepEqual(vibrationPattern('selection','off'),[])
  assert.ok(vibrationPattern('complete','subtle')[0]<vibrationPattern('complete','balanced')[0])
  assert.ok(vibrationPattern('complete','strong')[0]>vibrationPattern('complete','balanced')[0])
})
test('registered Capacitor Haptics bridge is preferred',async()=>{
  const calls=[]
  const env={Capacitor:{Plugins:{Haptics:{impact:async o=>calls.push(o),notification:async o=>calls.push(o)}}},navigator:{vibrate:()=>{throw Error('unwanted fallback')}}}
  assert.equal(await hapticFeedback('selection','subtle',env),true)
  assert.equal(await hapticFeedback('complete','strong',env),true)
  assert.deepEqual(calls,[{style:'LIGHT'},{type:'SUCCESS'}])
})
test('falls back safely if native plugin is not available',async()=>{
  let pattern=null
  const env={navigator:{vibrate:x=>(pattern=x,true)}}
  assert.equal(await hapticFeedback('warning','balanced',env),true)
  assert.deepEqual(pattern,vibrationPattern('warning','balanced'))
})
test('off and background disable feedback',async()=>{
  let hits=0
  const env={document:{visibilityState:'hidden'},navigator:{vibrate:()=>{hits++;return true}}}
  assert.equal(await hapticFeedback('selection','strong',env),false)
  assert.equal(await hapticFeedback('error','off',{navigator:env.navigator}),false)
  assert.equal(hits,0)
})
test('unsupported devices are safe no-ops',async()=>assert.equal(await hapticFeedback('complete','balanced',{}),false))
