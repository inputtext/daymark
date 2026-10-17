import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
test('v0.8 Notes migration limits access to the owning user',()=>{
 const sql=read('migrations/20261018_create_daymark_notes.sql')
 assert.match(sql,/ENABLE ROW LEVEL SECURITY/)
 assert.match(sql,/FOR SELECT TO authenticated\s+USING \(user_id = auth.uid\(\)\)/)
 assert.match(sql,/FOR INSERT TO authenticated\s+WITH CHECK \(user_id = auth.uid\(\)\)/)
 assert.match(sql,/REVOKE ALL ON public.daymark_notes FROM anon/)
 assert.match(sql,/deleted_at TIMESTAMPTZ/)
})
test('Android manifest declares biometric permission',()=>{
 assert.match(read('android/app/src/main/AndroidManifest.xml'),/android.permission.USE_BIOMETRIC/)
})
test('native biometric unlock is optional and per-account scoped',()=>{
 const app=read('src/App.jsx'),lib=read('src/lib/biometricLock.js')
 assert.match(lib,/daymark:biometric-lock:v08:/)
 assert.match(app,/session==='cloud'&&biometricLockEnabled/)
 assert.match(app,/onClick=\{\(\)=>void signOut\(\)\}/)
 assert.match(app,/Network\.addListener\('networkStatusChange'/)
 assert.match(app,/NativeApp\.addListener\('appStateChange'/)
})
