import type { GameBackend } from '../types';

/**
 * Firebase builds resolve `@/backend/mock` to this file (see metro.config.js),
 * so the competitive question bank — answers included — never ships to players.
 */
export const MockBackend = class {
  constructor() {
    throw new Error('The offline mock server is not part of this build.');
  }
} as unknown as new () => GameBackend;
