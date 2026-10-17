import { Capacitor } from '@capacitor/core'
import { NativeBiometric } from '@capgo/capacitor-native-biometric'

export const lockPreferenceKey = userId => userId ? 'daymark:biometric-lock:v08:'+userId : null
export const isNativeBiometricDevice = () => Capacitor.isNativePlatform() && Capacitor.getPlatform()==='android'

export function biometricLockEnabled(storage,userId) {
  const key=lockPreferenceKey(userId)
  if(!key || !isNativeBiometricDevice())return false
  try{return storage.getItem(key)==='enabled'}catch{return false}
}
export function setBiometricLockEnabled(storage,userId,enabled) {
  const key=lockPreferenceKey(userId)
  if(!key)throw new Error('Sign in to configure your app lock')
  if(enabled)storage.setItem(key,'enabled')
  else storage.removeItem(key)
}
export async function checkBiometricAvailability() {
  if(!isNativeBiometricDevice())return {isAvailable:false,reason:'Available only in the Android app'}
  const result=await NativeBiometric.isAvailable({useFallback:true})
  return {
    isAvailable:Boolean(result?.isAvailable && result?.deviceIsSecure),
    reason:result?.isAvailable?'':'Set up fingerprint and a screen lock in Android Settings',
  }
}
export async function verifyBiometricLock() {
  if(!isNativeBiometricDevice())throw new Error('App lock requires Android')
  // This protects the in-app UI; it does not authenticate with InsForge,
  // encrypt localStorage, or replace a password/session.
  await NativeBiometric.verifyIdentity({
    title:'Unlock Daymark',
    subtitle:'Your private workspace',
    description:'Confirm your fingerprint or device screen lock',
    reason:'Unlock your Daymark workspace',
    useFallback:true,
    maxAttempts:3,
  })
}
