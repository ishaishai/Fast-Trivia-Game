import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import * as FirebaseAuth from 'firebase/auth';
import { connectAuthEmulator, getAuth, initializeAuth, type Auth } from 'firebase/auth';
import { connectFirestoreEmulator, initializeFirestore, type Firestore } from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions, type Functions } from 'firebase/functions';
import { Platform } from 'react-native';

export interface FirebaseClients {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  functions: Functions;
  emulators: boolean;
}

const env = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  region: process.env.EXPO_PUBLIC_FUNCTIONS_REGION || 'europe-west1',
  emulators: process.env.EXPO_PUBLIC_USE_EMULATORS === '1',
  emulatorHost: process.env.EXPO_PUBLIC_EMULATOR_HOST || '127.0.0.1',
};

let clients: FirebaseClients | null = null;

/** Firebase, wired for this platform: AsyncStorage-backed auth on phones, emulators when asked. */
export function firebase(): FirebaseClients {
  if (clients) return clients;
  const config = env.emulators
    ? { apiKey: env.apiKey || 'demo-key', projectId: env.projectId || 'demo-meridian', appId: env.appId || 'demo-app', authDomain: 'localhost' }
    : { apiKey: env.apiKey, authDomain: env.authDomain, projectId: env.projectId, storageBucket: env.storageBucket, messagingSenderId: env.messagingSenderId, appId: env.appId };
  if (!config.apiKey || !config.projectId) {
    throw new Error(
      'Firebase isn’t configured. Copy .env.example to .env and fill in your project keys, run against the emulators with EXPO_PUBLIC_USE_EMULATORS=1, or set EXPO_PUBLIC_BACKEND=mock.',
    );
  }
  const app = getApps()[0] ?? initializeApp(config);

  let auth: Auth;
  if (Platform.OS === 'web') {
    auth = getAuth(app);
  } else {
    const getRNPersistence = (FirebaseAuth as unknown as { getReactNativePersistence?: (s: unknown) => FirebaseAuth.Persistence })
      .getReactNativePersistence;
    try {
      auth = getRNPersistence ? initializeAuth(app, { persistence: getRNPersistence(AsyncStorage) }) : getAuth(app);
    } catch {
      auth = getAuth(app); // already initialised (fast refresh)
    }
  }
  const db = initializeFirestore(app, { experimentalAutoDetectLongPolling: true });
  const functions = getFunctions(app, env.region);

  if (env.emulators) {
    const host = env.emulatorHost;
    connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
    connectFirestoreEmulator(db, host, 8080);
    connectFunctionsEmulator(functions, host, 5001);
  }

  clients = { app, auth, db, functions, emulators: env.emulators };
  return clients;
}

export const FUNCTIONS_REGION = env.region;
