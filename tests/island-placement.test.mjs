import test from 'node:test'
import assert from 'node:assert/strict'
import { ISLAND_PLACEMENT_DEFAULT, validateIslandPlacement } from '../src/lib/island.js'

test('Pixel 9 camera alignment has safe defaults', () => {
  assert.deepEqual(validateIslandPlacement(ISLAND_PLACEMENT_DEFAULT), {mode:'camera',x:0,y:0,width:280})
})
test('manual calibration supports left/right and vertical offsets', () => {
  assert.deepEqual(validateIslandPlacement({mode:'safe',x:-80,y:24,width:320}), {mode:'safe',x:-80,y:24,width:320})
  assert.deepEqual(validateIslandPlacement({mode:'camera',x:120,y:-24,width:180}), {mode:'camera',x:120,y:-24,width:180})
})
test('calibration rejects unsafe or invalid values', () => {
  const invalid=[
    {mode:'unsafe',x:0,y:0,width:280},
    {mode:'camera',x:121,y:0,width:280},
    {mode:'camera',x:-121,y:0,width:280},
    {mode:'camera',x:0,y:-25,width:280},
    {mode:'camera',x:0,y:141,width:280},
    {mode:'camera',x:0,y:0,width:179},
    {mode:'camera',x:0,y:0,width:341},
    {mode:'camera',x:0.1,y:0,width:280},
  ]
  for(const item of invalid) assert.throws(()=>validateIslandPlacement(item))
})
