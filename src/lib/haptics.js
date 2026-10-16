/**
 * Daymark tactile engine — no network calls. Feature-detects native Capacitor
 * Haptics where registered, with a browser vibration fallback.
 * This is an initial bridge: native Pixel validation requires the local
 * Android baseline and @capacitor/haptics JS package committed to GitHub.
 */
export const HAPTIC_LEVELS=['off','subtle','balanced','strong']

export function normalizeHapticLevel(level){
  return HAPTIC_LEVELS.includes(level)?level:'balanced'
}

const PATTERNS=Object.freeze({
  selection:[8],action:[17],success:[14,35,24],
  complete:[20,35,32],warning:[32,40,19],error:[18,32,18,32,30],
})
const IMPACT=Object.freeze({
  subtle:{selection:'LIGHT',action:'LIGHT',success:'LIGHT',complete:'LIGHT',warning:'MEDIUM',error:'MEDIUM'},
  balanced:{selection:'LIGHT',action:'MEDIUM',success:'MEDIUM',complete:'MEDIUM',warning:'HEAVY',error:'HEAVY'},
  strong:{selection:'MEDIUM',action:'HEAVY',success:'HEAVY',complete:'HEAVY',warning:'HEAVY',error:'HEAVY'},
})

export function vibrationPattern(kind,level='balanced'){
  if(normalizeHapticLevel(level)==='off')return []
  const profile=PATTERNS[kind]||PATTERNS.selection
  const scale=level==='subtle'?.6:level==='strong'?1.45:1
  return profile.map((duration,i)=>i%2===1?duration:Math.max(1,Math.round(duration*scale)))
}

export async function hapticFeedback(kind='selection',level='balanced',env=globalThis){
  const mode=normalizeHapticLevel(level)
  if(mode==='off'||env.document?.visibilityState==='hidden')return false
  const plugin=env.Capacitor?.Plugins?.Haptics
  if(plugin){
    try{
      if(['success','complete','warning','error'].includes(kind)&&typeof plugin.notification==='function'){
        const type=kind==='error'?'ERROR':kind==='warning'?'WARNING':'SUCCESS'
        await plugin.notification({type})
        return true
      }
      if(typeof plugin.impact==='function'){
        await plugin.impact({style:IMPACT[mode][kind]||IMPACT[mode].selection})
        return true
      }
    }catch{/* unsupported bridge: fall back */}
  }
  if(typeof env.navigator?.vibrate==='function'){
    try{return Boolean(env.navigator.vibrate(vibrationPattern(kind,mode)))}catch{return false}
  }
  return false
}
