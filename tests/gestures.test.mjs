import test from 'node:test'
import assert from 'node:assert/strict'
import {decideSwipe,shouldCancelLongPress,SWIPE_COMPLETE_PX,SWIPE_REVEAL_PX,SWIPE_VELOCITY_PX_S,SPRING} from '../src/lib/gestures.js'

test('right swipe completes; left swipe reveals but never deletes',()=>{
  assert.equal(decideSwipe(SWIPE_COMPLETE_PX),'complete')
  assert.equal(decideSwipe(-SWIPE_REVEAL_PX),'reveal')
  assert.equal(decideSwipe(-260),'reveal')
})
test('small taps, drags, and scroll movements close safely',()=>{
  for(const value of [-45,-10,0,10,60])assert.equal(decideSwipe(value),'close')
})
test('fast swipes require directional velocity and a meaningful distance',()=>{
  assert.equal(decideSwipe(64,SWIPE_VELOCITY_PX_S),'complete')
  assert.equal(decideSwipe(-46,-SWIPE_VELOCITY_PX_S),'reveal')
  assert.equal(decideSwipe(15,4000),'close')
  assert.equal(decideSwipe(-15,-4000),'close')
})
test('invalid values never trigger task changes',()=>{
  for(const value of [NaN,Infinity,-Infinity]){
    assert.equal(decideSwipe(value,0),'close')
    assert.equal(decideSwipe(300,value),'close')
  }
})
test('long press is cancelled by an actual drag or scroll',()=>{
  assert.equal(shouldCancelLongPress(6,6),false)
  assert.equal(shouldCancelLongPress(14,0),true)
  assert.equal(shouldCancelLongPress(0,20),true)
})
test('native-feeling positive stiffness and damping',()=>{
  assert.equal(SPRING.type,'spring')
  assert.ok(SPRING.stiffness>0&&SPRING.damping>0)
})
