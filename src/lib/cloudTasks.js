// A per-account, device-local queue for cloud task edits made without a connection.
// The queue is committed before the visible task cache is changed. Do not clear it
// on network failure: the user must be able to retry after restarting Daymark.
const idPattern = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i
export const taskOutboxKey = userId => userId ? 'daymark:tasks:v091:pending:' + userId : null

export function readTaskOutbox(storage, userId) {
  if (!userId) return {}
  try {
    const parsed = JSON.parse(storage.getItem(taskOutboxKey(userId)) || '{}')
    if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') return {}
    return Object.fromEntries(Object.entries(parsed).filter(([id, op]) =>
      idPattern.test(id) && op && (op.type === 'put' || op.type === 'delete') &&
      (op.type === 'delete' || (op.task && op.task.id === id && typeof op.task.title === 'string'))))
  } catch { return {} }
}

function writeTaskOutbox(storage, userId, pending) {
  if (!userId) throw new Error('No signed-in account for the task')
  storage.setItem(taskOutboxKey(userId), JSON.stringify(pending))
}

export function queueTaskPut(storage, userId, task) {
  if (!task || !idPattern.test(task.id || '') || typeof task.title !== 'string' || !task.title.trim())
    throw new Error('Invalid task cannot be saved offline')
  const pending = readTaskOutbox(storage, userId)
  pending[task.id] = { type: 'put', task }
  writeTaskOutbox(storage, userId, pending)
  return Object.keys(pending).length
}

export function queueTaskDelete(storage, userId, taskId) {
  if (!idPattern.test(taskId || '')) throw new Error('Invalid task ID')
  const pending = readTaskOutbox(storage, userId)
  pending[taskId] = { type: 'delete' }
  writeTaskOutbox(storage, userId, pending)
  return Object.keys(pending).length
}

// Pending deletes always win locally; a stale server response must not revive them.
export function overlayPendingTasks(remote, pending) {
  const map = new Map((Array.isArray(remote) ? remote : []).filter(task => task && idPattern.test(task.id || '')).map(task => [task.id, task]))
  for (const [id, op] of Object.entries(pending || {})) {
    if (!idPattern.test(id) || !op) continue
    if (op.type === 'delete') map.delete(id)
    else if (op.type === 'put' && op.task?.id === id) map.set(id, op.task)
  }
  return [...map.values()].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
}

const fields = (task, userId) => ({
  id: task.id,
  user_id: userId,
  title: task.title,
  notes: task.notes || '',
  due_date: task.due_date || null,
  due_time: task.due_time || null,
  priority: task.priority || 'medium',
  is_complete: Boolean(task.is_complete),
  ...(task.created_at ? {created_at: task.created_at} : {}),
  ...(task.updated_at ? {updated_at: task.updated_at} : {}),
})

const missingDueTime = error => /due_time|column.*not.*exist|schema cache/i.test(error?.message || '')

/** Retry-safe sync. Acknowledges one operation only if it has not changed mid-flight.
 * The server's owner-only RLS is still required; user_id filtering is defense in depth.
 */
export async function flushTaskOutbox({ storage, userId, client, dueTimeSupported = true }) {
  if (!userId || !client) return { uploaded: 0, pending: 0 }
  let uploaded = 0
  const queueKey = taskOutboxKey(userId)
  for (const [id, op] of Object.entries(readTaskOutbox(storage, userId))) {
    let response
    if (op.type === 'delete') {
      response = await client.database.from('tasks').delete().eq('id', id).eq('user_id', userId)
    } else {
      const payload = fields(op.task, userId)
      if (!dueTimeSupported && payload.due_time)
        throw new Error('Cloud task times require migrations/20261017_add_due_time.sql. Your changes are saved on this device.')
      if (!dueTimeSupported) delete payload.due_time
      response = await client.database.from('tasks').upsert(payload, {onConflict: 'id'})
      if (response.error && dueTimeSupported && missingDueTime(response.error)) {
        if (payload.due_time)
          throw new Error('Cloud task times require migrations/20261017_add_due_time.sql. Your changes are saved on this device.')
        delete payload.due_time
        response = await client.database.from('tasks').upsert(payload, {onConflict: 'id'})
      }
    }
    if (response.error) throw new Error(response.error.message || 'Could not sync cloud tasks')
    uploaded++
    const current = readTaskOutbox(storage, userId)
    if (JSON.stringify(current[id]) === JSON.stringify(op)) {
      delete current[id]
      storage.setItem(queueKey, JSON.stringify(current))
    }
  }
  return { uploaded, pending: Object.keys(readTaskOutbox(storage, userId)).length }
}
