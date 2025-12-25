// Location uploader service
// - Reads interval and collection name from environment (process.env)
// - Exposes `startLocationUpload`, `stopLocationUpload`, `pushLocationOnce`, and `configure`.
// Notes: Requires a Firestore module and a geolocation provider at runtime.
// Install if missing: `yarn add @react-native-firebase/firestore @react-native-community/geolocation` (or your chosen geolocation lib)

import Geolocation from '@react-native-community/geolocation';
import firestore from '@react-native-firebase/firestore';

let intervalId: number | null = null;
let intervalMs = Number(process.env.LOCATION_UPLOAD_INTERVAL_MS) || 60000;
let collectionName = process.env.FIRESTORE_COLLECTION || 'locations';
let enabled = (process.env.LOCATION_UPLOAD_ENABLED || 'true') === 'true';
let userId: string | null = process.env.LOCATION_USER_ID || null;

export function configure(opts: { intervalMs?: number; collection?: string; enabled?: boolean } = {}) {
  if (typeof opts.intervalMs === 'number') intervalMs = opts.intervalMs;
  if (typeof opts.collection === 'string') collectionName = opts.collection;
  if (typeof opts.enabled === 'boolean') enabled = opts.enabled;
  if (typeof (opts as any).userId === 'string') userId = (opts as any).userId;
}

function getAuthModule(): any | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('@react-native-firebase/auth');
    return mod && mod.default ? mod.default : mod;
  } catch (e) {
    return null;
  }
}

async function getCurrentLocation(): Promise<{ latitude: number; longitude: number }>
{
  
  // Normalize module shapes: module may export getCurrentPosition directly,
  // or expose a `Geolocation` property, or be the browser `navigator.geolocation`.
  const geo = Geolocation.getCurrentPosition;
  
  return new Promise((resolve, reject) => {
    try {
      geo(
        (pos: any) => {
          const c = pos && (pos.coords || pos);
          resolve({ latitude: c.latitude, longitude: c.longitude });
        },
        (err: any) => reject(err),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 1000 }
      );
    } catch (err) {
      reject(err);
    }
  });
}

export async function pushLocationOnce(): Promise<void> {
  if (!enabled) return;
  
  // Resolve a usable firestore instance. The require result can be:
  // - a function (callable) that returns an instance when invoked: firestore()
  // - an object that already is the instance with `collection` method
  // - a namespace with `default` etc. We normalize below.

  try {
    const { latitude, longitude } = await getCurrentLocation();

    // Try to get FieldValue/serverTimestamp if available
    
    const entry: any = {
      lat: latitude,
      lng: longitude,
      createdAt: new Date(),
    };

    // Determine user id to use as document key. Preference order:
    // 1. configured `userId` via configure()
    // 2. process.env.LOCATION_USER_ID
    // 3. current firebase auth user (if available)
    let uid = userId;
    if (!uid) {
      const authMod = getAuthModule();
      try {
        let authInstance: any = null;
        if (typeof authMod === 'function') {
          authInstance = authMod();
        } else if (authMod && typeof authMod.currentUser !== 'undefined') {
          authInstance = authMod;
        } else if (authMod && authMod.default && typeof authMod.default === 'function') {
          authInstance = authMod.default();
        }
        if (authInstance && authInstance.currentUser && authInstance.currentUser.uid) {
          uid = authInstance.currentUser.uid;
        }
      } catch (e) {
        // ignore
      }
    }

    if (!uid) {
      console.warn('No user id available for location document key; skipping upload. Provide userId via configure() or ensure Firebase Auth is initialized.');
      return;
    }

    // Use document with key = uid and overwrite previous location each time
    console.log(`Pushing location for uid=${uid} to collection=${collectionName}:`, entry);
    await firestore().collection(collectionName).doc(String(uid)).set(entry);
  } catch (err) {
    console.warn('Failed to push location:', err);
  }
}

export function startLocationUpload() {
  if (!enabled) return;
  if (intervalId) return; // already running
  // push immediately then schedule
  pushLocationOnce().catch(() => {});
  // `setInterval` returns a number in React Native
  intervalId = setInterval(() => {
    pushLocationOnce().catch(() => {});
  }, intervalMs) as unknown as number;
}

export function stopLocationUpload() {
  if (!intervalId) return;
  clearInterval(intervalId as unknown as number);
  intervalId = null;
}

export function isRunning() {
  return !!intervalId;
}

export function getConfig() {
  return { intervalMs, collectionName, enabled };
}

export default {
  configure,
  startLocationUpload,
  stopLocationUpload,
  pushLocationOnce,
  isRunning,
  getConfig,
};
