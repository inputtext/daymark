import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const app=readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8')
const css=readFileSync(new URL('../src/sidebar-account.css',import.meta.url),'utf8')
const main=readFileSync(new URL('../src/main.jsx',import.meta.url),'utf8')

test('account footer is outside scrollable sidebar menu and remains actionable',()=>{
  const start=app.indexOf('className="sidebar-scroll"')
  const end=app.indexOf('className="sidebar-footer"')
  const close=app.lastIndexOf('</div>',end)
  assert.ok(start>0&&end>start&&close>start)
  assert.match(app.slice(start,end),/className="sidebar-tip"/)
  assert.match(app.slice(end,app.indexOf('</aside>',end)),/onClick=\{signOut\}/)
  assert.match(app,/Exit demo · Sign in/)
  assert.match(app,/Sign out of account/)
})
test('mobile sidebar overlays bottom nav and footer does not scroll away',()=>{
  assert.match(css,/\.app-shell \.sidebar-scroll\s*\{[^}]*flex:1 1 auto;[^}]*overflow-y:auto;/s)
  assert.match(css,/\.app-shell \.sidebar-footer\s*\{[^}]*flex:0 0 auto;/s)
  assert.match(css,/z-index:90/)
  assert.match(css,/padding-bottom:calc\(12px \+ var\(--dm-inset-bottom,0px\)\)/)
  assert.match(main,/import '\.\/sidebar-account\.css'/)
})
