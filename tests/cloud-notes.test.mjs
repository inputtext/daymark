import test from 'node:test'
import assert from 'node:assert/strict'
import {
  notesOutboxKey,readNotesOutbox,queueNoteChanges,overlayPending,shouldImportLocal,syncCloudNotes,
} from '../src/lib/cloudNotes.js'
const storage=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)}}
const old={id:'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',title:'Offline',body:'Draft',pinned:false,created_at:'2026-10-01T00:00:00Z',updated_at:'2026-10-01T00:00:00Z'}
const scope='daymark:notes:v1:user:person'

test('local edits and deletes create per-user outbox with tombstones',()=>{
 const st=storage()
 queueNoteChanges(st,scope,[],[old])
 assert.equal(readNotesOutbox(st,scope)[old.id].type,'put')
 queueNoteChanges(st,scope,[old],[])
 assert.equal(readNotesOutbox(st,scope)[old.id].type,'delete')
 assert.ok(readNotesOutbox(st,scope)[old.id].note.deleted_at)
 assert.notEqual(notesOutboxKey(scope),notesOutboxKey(scope+'other'))
})
test('cloud reconciliation preserves pending deletes/edits and never revives server tombstones',()=>{
 const pending={[old.id]:{type:'delete',note:{...old,deleted_at:new Date().toISOString()}}}
 assert.equal(overlayPending([old],pending).length,0)
 assert.equal(shouldImportLocal(old,{...old,deleted_at:'2026-10-02T00:00:00Z'}),false)
 assert.equal(shouldImportLocal(old,undefined),true)
 assert.equal(shouldImportLocal(old,{...old,updated_at:'2026-10-03T00:00:00Z'}),false)
})
test('initial upload imports existing local notes and leaves them intact when backend errors',async()=>{
 const st=storage();st.setItem(scope,JSON.stringify([old]))
 let fail=true,stored=[]
 const client={database:{from:()=>({
   select:()=>({order:async()=>({data:stored,error:fail?{message:'Migration missing'}:null})}),
   upsert:async row=>{stored=[row];return{data:null,error:null}},
 })}}
 await assert.rejects(syncCloudNotes({storage:st,scope,userId:'person',client}),/Migration missing/)
 assert.equal(JSON.parse(st.getItem(scope)).length,1)
 fail=false
 const result=await syncCloudNotes({storage:st,scope,userId:'person',client})
 assert.equal(result.uploaded,1)
 assert.equal(result.pending,0)
 assert.equal(JSON.parse(st.getItem(scope)).length,1)
})
