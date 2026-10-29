import type { GameBackend } from '../types';

/** Mock builds resolve `@/backend/firebase` here (see metro.config.js) to keep the Firebase SDK out of the bundle. */
export const FirebaseBackend = class {
  constructor() {
    throw new Error('The Firebase backend is not part of this build. Set EXPO_PUBLIC_BACKEND=firebase.');
  }
} as unknown as new () => GameBackend;
