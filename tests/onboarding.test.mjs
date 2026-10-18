import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const load=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
const app=load('src/App.jsx')
const component=load('src/components/Onboarding.jsx')
const css=load('src/onboarding.css')
test('first-run guest onboarding is gated after auth session resolution',()=>{
 const loading=app.indexOf("if (session === 'loading') return")
 const onboarding=app.indexOf("if (session === 'guest' && !onboardingComplete)")
 const auth=app.indexOf("if (session === 'guest') return <AuthScreen")
 assert.ok(loading!==-1&&loading<onboarding&&onboarding<auth)
 assert.match(app,/hasSeenOnboarding\(localStorage\)/)
 assert.match(app,/markOnboardingSeen\(localStorage\);setOnboardingComplete\(true\)/)
})
test('onboarding features four slides and required navigation patterns',()=>{
 for(const id of ["id:'welcome'","id:'tasks'","id:'notes'","id:'reminders'"])assert.ok(component.includes(id))
 for(const txt of ['Back','Get started','ArrowRight','ArrowLeft','onTouchStart','onTouchEnd','aria-current','useReducedMotion'])assert.ok(component.includes(txt))
 assert.match(component,/setChecked\(value=>!value\)/)
 assert.match(component,/daymark:onboarding:v1/)
})
test('onboarding does not request permissions or access user content',()=>{
 assert.doesNotMatch(component,/insforge\.auth|insforge\.database|LocalNotifications\.requestPermissions|verifyBiometricLock|SystemBars\.setStyle/)
 assert.match(css,/max-width:380px/)
 assert.match(css,/prefers-reduced-motion:reduce/)
 assert.match(load('src/main.jsx'),/import '\.\/onboarding\.css'/)
})

test('signed-out users can replay the introduction without clearing local data',()=>{
 assert.match(app,/onShowIntro=\{\(\)=>setOnboardingComplete\(false\)\}/)
 assert.match(app,/See what Daymark can do/)
 assert.match(css,/\.dm-ob-replay/)
})

test('mandatory first-time tour cannot be skipped or fast-forwarded via progress indicators',()=>{
 assert.doesNotMatch(component,/dm-ob-skip|onClick=\{finish\}[^]*?Skip|Skip introduction and continue to sign in/)
 assert.match(component,/if\(index!==last\)return;feel\?\.\('success'\);onComplete\(\)/)
 assert.doesNotMatch(component,/onClick=\{\(\)=>go\(i\)\}/)
 assert.match(component,/dm-ob-progress-step/)
 assert.match(component,/YOUR FIRST STEPS/)
})
