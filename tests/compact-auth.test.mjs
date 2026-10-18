import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const file=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
const app=file('src/App.jsx')
const css=file('src/compact-auth.css')
const main=file('src/main.jsx')

test('sign-in and sign-up remain available with original InsForge SDK actions',()=>{
  assert.match(app,/className="welcome-shell dm-auth-compact"/)
  assert.match(app,/tab === 'signup' \? 'Create your space' : 'Welcome back\.'/)
  assert.match(app,/insforge\.auth\.signInWithPassword/)
  assert.match(app,/insforge\.auth\.signUp/)
  assert.match(app,/insforge\.auth\.verifyEmail/)
  assert.match(app,/onClick=\{\(\) => \{setTab\('signin'\)/)
  assert.match(app,/onClick=\{\(\) => \{setTab\('signup'\)/)
})
test('optional demo and intro remain reachable while decorative text is removed',()=>{
  assert.match(app,/dm-auth-alternatives/)
  assert.match(app,/Explore demo/)
  assert.match(app,/View intro/)
  assert.doesNotMatch(app,/className="or-divider"/)
  assert.doesNotMatch(app,/className="auth-footnote"/)
  assert.doesNotMatch(app,/A simpler way to keep everything moving\. Start where you are\./)
})
test('mobile account layout is viewport-aware but retains scrollability for accessibility',()=>{
  assert.match(css,/@media\(max-width:700px\)/)
  assert.match(css,/min-height:calc\(100dvh - var\(--dm-inset-top,0px\)\)/)
  assert.match(css,/var\(--dm-inset-bottom,0px\)/)
  assert.match(css,/\.dm-auth-compact \.welcome-mobile-logo\s*\{[^}]*position:static/s)
  assert.match(css,/overflow-y:visible/)
  assert.doesNotMatch(css,/overflow-y:hidden/)
  assert.match(css,/max-height:590px/)
  assert.match(main,/import '\.\/compact-auth\.css'/)
})
test('verification messages and form error remain visible',()=>{
  assert.match(app,/verification && <p className="auth-subtitle"/)
  assert.match(app,/role="alert"/)
  assert.match(app,/!verification && <div className="dm-auth-alternatives"/)
})
