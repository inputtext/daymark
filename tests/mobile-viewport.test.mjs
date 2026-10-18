import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const app=read('src/App.jsx')
const css=read('src/mobile-viewport-fix.css')
test('mobile network status is embedded in avatar, avoiding an extra topbar column',()=>{
 assert.match(app,/daymark-profile-avatar/)
 assert.match(app,/daymark-avatar-status/)
 assert.match(css,/\.app-shell \.topbar \.daymark-connection-badge\{display:none\}/)
 assert.match(css,/\.app-shell \.daymark-avatar-status\s*\{[^}]*display:grid/s)
})
test('mobile layout shrinks both header halves and main content inside viewport',()=>{
 assert.match(css,/\.app-shell \.app-content\s*\{[^}]*overflow-x:clip;/s)
 assert.match(css,/\.app-shell \.topbar-leading\{flex:1 1 auto;min-width:0\}/)
 assert.match(css,/\.app-shell \.topbar-actions\{flex:0 0 auto;min-width:0\}/)
 assert.match(css,/\.app-shell \.main-area\s*\{[^}]*max-width:100%;/s)
 assert.match(read('src/main.jsx'),/import '\.\/mobile-viewport-fix\.css'/)
})
