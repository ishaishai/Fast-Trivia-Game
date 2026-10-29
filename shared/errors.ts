export type GameErrorCode =
  | 'unauthenticated'
  | 'invalid'
  | 'not-found'
  | 'handle-taken'
  | 'registration-not-open'
  | 'registration-closed'
  | 'registration-not-required'
  | 'not-registered'
  | 'not-open'
  | 'closed'
  | 'already-played'
  | 'run-over'
  | 'bad-seq'
  | 'no-skips'
  | 'unavailable';

/** Plain-language messages, written from the player's side of the screen. */
export const ERROR_COPY: Record<GameErrorCode, string> = {
  unauthenticated: 'Sign-in expired. Reload to continue.',
  invalid: 'That request didn’t make sense to the server. Try again.',
  'not-found': 'That competition doesn’t exist.',
  'handle-taken': 'That name is taken. Try another.',
  'registration-not-open': 'Registration opens 24 hours before the doors.',
  'registration-closed': 'Registration closed when the doors opened.',
  'registration-not-required': 'The Daily is open to everyone. No registration needed.',
  'not-registered': 'You need to register before the doors open.',
  'not-open': 'The doors aren’t open yet.',
  closed: 'This competition has closed.',
  'already-played': 'You’ve already run this one. One run per competition.',
  'run-over': 'This run is already over.',
  'bad-seq': 'Out of sync with the server. Resuming your run.',
  'no-skips': 'No skips left today. They refill at midnight.',
  unavailable: 'Can’t reach the server. Check your connection.',
};

export class GameError extends Error {
  readonly code: GameErrorCode;
  constructor(code: GameErrorCode, message?: string) {
    super(message ?? ERROR_COPY[code]);
    this.code = code;
    this.name = 'GameError';
  }
}

export function isGameError(error: unknown): error is GameError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as { code: unknown }).code === 'string' &&
    (error as { code: string }).code in ERROR_COPY
  );
}
