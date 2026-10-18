import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8')

test('cloud task refresh scopes both primary and legacy-schema queries to current user', () => {
  const refresh = app.split('const refresh = useCallback(async () => {')[1]?.split('  useEffect(()=>{')[0]
  assert.ok(refresh, 'cloud task refresh callback must exist')
  const queries = [...refresh.matchAll(/\.select\('id,user_id,title,notes,due_date(?:,due_time)?,priority,is_complete,created_at,updated_at'\)\s*\.eq\('user_id',\s*user\.id\)/g)]
  assert.equal(queries.length, 2, 'both regular and due_time fallback queries must be user-scoped')
  assert.match(refresh, /activeSyncScope\.current===notesStorageKey\('cloud',user\.id\)/, 'stale account responses must not update task state')
})
