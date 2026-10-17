import test from 'node:test'
import assert from 'node:assert/strict'
import {
  NOTE_BODY_LIMIT,NOTE_TITLE_LIMIT,NOTES_LIMIT,
  cleanNote,newDraft,notesStorageKey,readNotes,writeNotes,saveDraft,
  togglePinned,deleteNote,sortedNotes,fabGesture,
} from '../src/lib/notes.js'

function createStorage() {
  const data=new Map()
  return {
    getItem(key){return data.has(key)?data.get(key):null},
    setItem(key,value){data.set(key,value)},
    removeItem(key){data.delete(key)}
  }
}
const id='d52f92bf-c2d7-47cd-9479-c4ce905e2f22'
const now='2026-10-17T12:00:00.000Z'

test('notes use per-user device-local keys and do not collide with demo',()=>{
  assert.equal(notesStorageKey('demo'),'daymark:notes:v1:demo')
  assert.equal(notesStorageKey('cloud','user-22'),'daymark:notes:v1:user:user-22')
  assert.equal(notesStorageKey('cloud','../outside'),null)
  assert.equal(notesStorageKey('guest'),null)
})
test('an empty quick capture does not create an unwanted note',()=>{
  const draft=newDraft(id,now)
  assert.deepEqual(saveDraft([],draft,now),[])
})
test('quick typing saves instantly, preserves created date, and edits in place',()=>{
  const storage=createStorage(),scope=notesStorageKey('demo')
  let list=saveDraft([], {...newDraft(id,now),body:'one idea'},now)
  writeNotes(storage,scope,list)
  assert.equal(readNotes(storage,scope)[0].body,'one idea')
  assert.equal(readNotes(storage,scope).length,1)
  list=saveDraft(readNotes(storage,scope), {...list[0],title:'My title',body:'second version'},'2026-10-18T12:00:00.000Z')
  writeNotes(storage,scope,list)
  assert.equal(list.length,1)
  assert.equal(list[0].created_at,now)
  assert.equal(list[0].updated_at,'2026-10-18T12:00:00.000Z')
  assert.equal(list[0].title,'My title')
})
test('pins sort first and can be toggled; deletion is deliberate',()=>{
  const a=saveDraft([], {...newDraft('a',now),title:'Alpha'},now)
  const b=saveDraft(a,{...newDraft('b','2026-10-18T12:00:00.000Z'),title:'Beta'},'2026-10-18T12:00:00.000Z')
  const pinned=togglePinned(b,'a')
  assert.equal(sortedNotes(pinned)[0].id,'a')
  assert.equal(sortedNotes(pinned,'beta').length,1)
  assert.equal(sortedNotes(pinned,'missing').length,0)
  assert.equal(togglePinned(pinned,'a')[1].pinned,false) // pins can turn off
  assert.equal(deleteNote(pinned,'b').length,1)
})
test('corrupt note storage and records are safely ignored',()=>{
  const storage=createStorage(),scope=notesStorageKey('demo')
  storage.setItem(scope,'{broken')
  assert.deepEqual(readNotes(storage,scope),[])
  storage.setItem(scope,JSON.stringify([{id:'bad path/',title:'oops'}, {id:'safe',title:'okay',body:4}]))
  const result=readNotes(storage,scope)
  assert.equal(result.length,1)
  assert.equal(result[0].body,'4')
})
test('notes enforce local limits and trim unsafe oversized content',()=>{
  const normalized=cleanNote({...newDraft('limit',now),title:'t'.repeat(999),body:'b'.repeat(15000)},now)
  assert.equal(normalized.title.length,NOTE_TITLE_LIMIT)
  assert.equal(normalized.body.length,NOTE_BODY_LIMIT)
  assert.throws(()=>writeNotes(createStorage(),notesStorageKey('demo'),Array.from({length:NOTES_LIMIT+1},(_,i)=>({id:String(i)}))))
})
test('thumb swipe recognizer cannot mistake a task-like vertical scroll for note capture',()=>{
  assert.equal(fabGesture(-60,4),'quick-note')
  assert.equal(fabGesture(-61,-70),'tap')
  assert.equal(fabGesture(4,-60),'expand')
  assert.equal(fabGesture(-10,5),'tap')
  assert.equal(fabGesture(Number.NaN,-60),'tap')
})
