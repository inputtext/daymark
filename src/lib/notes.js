/**
 * Daymark Quick Notes v0.7 — offline-first storage.
 * Notes are intentionally DEVICE-LOCAL, namespaced per demo or user ID.
 * Do not imply these notes are cloud-synced or end-to-end encrypted.
 */
export const NOTE_TITLE_LIMIT = 160
export const NOTE_BODY_LIMIT = 12000
export const NOTES_LIMIT = 300

export function notesStorageKey(session, userId) {
  if (session === 'demo') return 'daymark:notes:v1:demo'
  if (session === 'cloud' && typeof userId === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(userId)) {
    return 'daymark:notes:v1:user:' + userId
  }
  return null
}

export function cleanNote(input, fallbackTime = new Date().toISOString()) {
  if (!input || typeof input !== 'object' || typeof input.id !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(input.id)) return null
  const title = String(input.title ?? '').slice(0, NOTE_TITLE_LIMIT)
  const body = String(input.body ?? '').slice(0, NOTE_BODY_LIMIT)
  return {
    id: input.id,
    title,
    body,
    pinned: input.pinned === true,
    created_at: typeof input.created_at === 'string' && !Number.isNaN(Date.parse(input.created_at)) ? input.created_at : fallbackTime,
    updated_at: typeof input.updated_at === 'string' && !Number.isNaN(Date.parse(input.updated_at)) ? input.updated_at : fallbackTime,
  }
}

export function newDraft(id, now = new Date().toISOString()) {
  return cleanNote({ id, title: '', body: '', pinned: false, created_at: now, updated_at: now }, now)
}

export function readNotes(storage, scope) {
  if (!scope) return []
  try {
    const raw = JSON.parse(storage.getItem(scope) || '[]')
    if (!Array.isArray(raw)) return []
    const unique = new Map()
    for (const item of raw.slice(0, NOTES_LIMIT)) {
      const note = cleanNote(item)
      if (note) unique.set(note.id, note)
    }
    return [...unique.values()]
  } catch { return [] }
}

export function writeNotes(storage, scope, notes) {
  if (!scope) throw new Error('Sign in or open demo mode to save notes.')
  if (!Array.isArray(notes) || notes.length > NOTES_LIMIT) throw new Error('Local note limit reached. Delete an old note before adding more.')
  storage.setItem(scope, JSON.stringify(notes))
}

export function saveDraft(notes, draft, now = new Date().toISOString()) {
  const next = cleanNote({...draft, updated_at:now}, now)
  if (!next) throw new Error('Could not save this note')
  const index = notes.findIndex(note => note.id === next.id)
  if (index === -1 && !next.title.trim() && !next.body.trim()) return notes
  if (index === -1 && notes.length >= NOTES_LIMIT) throw new Error('Local note limit reached. Delete an old note before adding more.')
  const updated = index === -1 ? [next, ...notes] : notes.map(note => note.id === next.id ? {...next,created_at:note.created_at} : note)
  return updated
}

export function togglePinned(notes, id, now = new Date().toISOString()) {
  return notes.map(note => note.id === id ? {...note, pinned: !note.pinned, updated_at: now} : note)
}

export function deleteNote(notes, id) {
  return notes.filter(note => note.id !== id)
}

export function sortedNotes(notes, query = '') {
  const q = String(query).toLocaleLowerCase().trim()
  return notes.filter(note => !q || (note.title + ' ' + note.body).toLocaleLowerCase().includes(q))
    .sort((a,b) => Number(b.pinned)-Number(a.pinned) || b.updated_at.localeCompare(a.updated_at))
}

// FAB swipe recognition: a deliberate left-swipe triggers Quick Note; an
// upward-swipe reveals the actions. Ignore short drags and vertical scroll.
export function fabGesture(dx, dy) {
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return 'tap'
  if (dx <= -48 && Math.abs(dx) > Math.abs(dy) * 1.25) return 'quick-note'
  if (dy <= -45 && Math.abs(dy) > Math.abs(dx) * 1.25) return 'expand'
  return 'tap'
}
