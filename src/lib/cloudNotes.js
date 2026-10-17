import { cleanNote, NOTES_LIMIT, readNotes, writeNotes } from './notes.js'

export const notesOutboxKey = scope => scope ? scope + ':pending:v08' : null
export const notesImportedKey = scope => scope ? scope + ':imported:v08' : null

export function readNotesOutbox(storage,scope) {
  if (!scope) return {}
  try {
    const json=JSON.parse(storage.getItem(notesOutboxKey(scope))||'{}')
    if (!json||typeof json!=='object'||Array.isArray(json)) return {}
    return Object.fromEntries(Object.entries(json).filter(([id,item])=>
      /^[\w-]{1,100}$/.test(id) && item && (item.type==='put'||item.type==='delete') && cleanNote(item.note)))
  } catch { return {} }
}

export function queueNoteChanges(storage,scope,before,after,now=new Date().toISOString()) {
  if (!scope) return
  const old=new Map(before.map(note=>[note.id,note]))
  const next=new Map(after.map(note=>[note.id,note]))
  const pending=readNotesOutbox(storage,scope)
  for (const [id,note] of next) {
    if (JSON.stringify(old.get(id))!==JSON.stringify(note)) pending[id]={type:'put',note}
  }
  for (const [id,note] of old) {
    if (!next.has(id))pending[id]={type:'delete',note:{...note,updated_at:now,deleted_at:now}}
  }
  storage.setItem(notesOutboxKey(scope),JSON.stringify(pending))
  return Object.keys(pending).length
}

export function overlayPending(remote,pending) {
  const result=new Map(remote.filter(note=>!note.deleted_at).map(note=>[note.id,cleanNote(note)]))
  for (const [id,op] of Object.entries(pending)) {
    if (op.type==='delete') result.delete(id)
    else result.set(id,cleanNote(op.note))
  }
  return [...result.values()].filter(Boolean).sort((a,b)=>b.updated_at.localeCompare(a.updated_at)).slice(0,NOTES_LIMIT)
}

export function shouldImportLocal(local,remote) {
  if(!remote)return true
  if(remote.deleted_at)return false
  return local.updated_at>remote.updated_at
}

function serverPayload(op,userId) {
  const note=op.note
  return {
    id:note.id,user_id:userId,title:note.title,body:note.body,
    pinned:note.pinned,created_at:note.created_at,updated_at:note.updated_at,
    deleted_at:op.type==='delete'?note.deleted_at||note.updated_at:null,
  }
}
function throwResponse(response) {
  if(response.error)throw new Error(response.error.message||'InsForge Notes request failed')
  return response.data||[]
}

/** An idempotent device-local outbox. Local copies are NEVER cleared on API errors.
 * Initial import preserves legacy v0.7 notes, and server tombstones prevent
 * accidentally recreating notes that were deleted on another device.
 */
export async function syncCloudNotes({storage,scope,userId,client}) {
  if (!scope || !userId || !client) return {status:'inactive',pending:0}
  const table=()=>client.database.from('daymark_notes')
  const fetchRemote=async()=>throwResponse(await table()
    .select('id,title,body,pinned,created_at,updated_at,deleted_at')
    .order('updated_at',{ascending:false}))
  let remote=await fetchRemote() // Migration & permissions checked before writing anything.
  const queueKey=notesOutboxKey(scope)
  if(storage.getItem(notesImportedKey(scope))!=='yes'){
    const byId=new Map(remote.map(note=>[note.id,note]))
    const local=readNotes(storage,scope)
    const pending=readNotesOutbox(storage,scope)
    for(const note of local){
      if(!pending[note.id] && shouldImportLocal(note,byId.get(note.id)))
        pending[note.id]={type:'put',note}
    }
    storage.setItem(queueKey,JSON.stringify(pending))
    storage.setItem(notesImportedKey(scope),'yes')
  }
  const pending=readNotesOutbox(storage,scope)
  let uploaded=0
  for(const [id,op] of Object.entries(pending)){
    throwResponse(await table().upsert(serverPayload(op,userId),{onConflict:'id'}))
    uploaded++
    // A newer edit/delete may have been queued while this request was in flight.
    const current=readNotesOutbox(storage,scope)
    if(JSON.stringify(current[id])===JSON.stringify(op)){
      delete current[id]
      storage.setItem(queueKey,JSON.stringify(current))
    }
  }
  remote=await fetchRemote()
  const merged=overlayPending(remote,readNotesOutbox(storage,scope))
  writeNotes(storage,scope,merged)
  return {status:'synced',uploaded,pending:Object.keys(readNotesOutbox(storage,scope)).length,notes:merged}
}
