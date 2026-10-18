import test from 'node:test'
import assert from 'node:assert/strict'
import {taskOutboxKey, readTaskOutbox, queueTaskPut, queueTaskDelete, overlayPendingTasks, flushTaskOutbox} from '../src/lib/cloudTasks.js'

const storage = () => {const map = new Map(); return {getItem: key => map.get(key) ?? null, setItem:(key, value)=>map.set(key, String(value)), removeItem:key=>map.delete(key)}}
const id = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'
const task = {id, title:'Offline assignment', notes:'', priority:'high', due_date:null, due_time:null, is_complete:false, created_at:'2026-10-18T10:00:00Z'}

test('queues offline updates per user and deletes hide stale server tasks', () => {
  const s = storage()
  queueTaskPut(s,'alice',task)
  assert.equal(readTaskOutbox(s,'alice')[id].type,'put')
  assert.deepEqual(readTaskOutbox(s,'bob'),{})
  assert.equal(overlayPendingTasks([], readTaskOutbox(s,'alice'))[0].title, task.title)
  queueTaskDelete(s,'alice',id)
  assert.equal(readTaskOutbox(s,'alice')[id].type,'delete')
  assert.deepEqual(overlayPendingTasks([task],readTaskOutbox(s,'alice')),[])
  assert.notEqual(taskOutboxKey('alice'),taskOutboxKey('bob'))
})

test('never acknowledges a failed write and retries it later', async () => {
  const s = storage()
  queueTaskPut(s, 'alice', task, {isNew:true})
  let fail = true, uploaded = null
  const client = {database:{from:()=>({upsert: async payload => {if(fail)return {error:{message:'Offline'}}; uploaded=payload;return {error:null}}})}}
  await assert.rejects(flushTaskOutbox({storage:s,userId:'alice',client}),/Offline/)
  assert.equal(Object.keys(readTaskOutbox(s,'alice')).length,1)
  fail=false
  assert.deepEqual(await flushTaskOutbox({storage:s,userId:'alice',client}),{uploaded:1,pending:0})
  assert.equal(uploaded.user_id,'alice')
  assert.deepEqual(readTaskOutbox(s,'alice'),{})
})

test('delete is scoped to the account and is retry-safe', async () => {
  const s=storage();queueTaskDelete(s,'alice',id)
  const calls=[]
  const chain = {eq(key,value){calls.push([key,value]); if (calls.length === 2) return Promise.resolve({error:null}); return this}}
  const client={database:{from:()=>({delete:()=>chain})}}
  assert.deepEqual(await flushTaskOutbox({storage:s,userId:'alice',client}),{uploaded:1,pending:0})
  assert.deepEqual(calls,[['id',id],['user_id','alice']])
})

test('keeps a newer edit queued when the previous request finishes', async () => {
  const s=storage();queueTaskPut(s,'alice',task,{isNew:true})
  const client={database:{from:()=>({upsert:async()=>{queueTaskPut(s,'alice',{...task,title:'Edited during sync'});return {error:null}}})}}
  const result=await flushTaskOutbox({storage:s,userId:'alice',client})
  assert.deepEqual(result,{uploaded:1,pending:1})
  assert.equal(readTaskOutbox(s,'alice')[id].task.title,'Edited during sync')
})

test('legacy cloud schema does not discard queued task time', async () => {
  const s=storage();queueTaskPut(s,'alice',{...task,due_time:'09:00'},{isNew:true})
  const client={database:{from:()=>({upsert:async()=>({error:{message:'column "due_time" does not exist'}})})}}
  await assert.rejects(flushTaskOutbox({storage:s,userId:'alice',client}),/migration/)
  assert.equal(Object.keys(readTaskOutbox(s,'alice')).length,1)
})

test('rejects storage write failures rather than silently losing edits', () => {
  const s={getItem:()=>null,setItem:()=>{throw new Error('Storage quota')}}
  assert.throws(()=>queueTaskPut(s,'alice',task),/Storage quota/)
})

test('edited remote tasks use UPDATE, never upsert which can resurrect a server-deleted row', async () => {
  const s=storage();queueTaskPut(s,'alice',{...task,title:'Edited'})
  const calls=[]
  let eqCount=0;const chain={eq(k,v){calls.push([k,v]); eqCount++;if(eqCount===2)return Promise.resolve({error:null});return this}}
  const client={database:{from:()=>({update:patch=>{calls.push(['title',patch.title]);return chain},upsert:()=>{throw Error('must not upsert existing task')}})}}
  await flushTaskOutbox({storage:s,userId:'alice',client})
  assert.deepEqual(calls,[['title','Edited'],['id',id],['user_id','alice']])
})

test('new tasks remain creates after offline edits',()=>{
  const s=storage()
  queueTaskPut(s,'alice',task,{isNew:true})
  queueTaskPut(s,'alice',{...task,title:'Updated before sync'})
  assert.equal(readTaskOutbox(s,'alice')[id].isNew,true)
})
