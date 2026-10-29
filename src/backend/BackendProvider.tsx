import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useGame } from '@/stores/game';
import { createBackend } from './index';
import type { GameBackend } from './types';

const BackendContext = createContext<GameBackend | null>(null);

/**
 * Owns the backend for the life of the app: initialises it, loads the
 * profile and keeps today's view of the competitions flowing into the store.
 */
export function BackendProvider({ children }: { children: ReactNode }) {
  const [backend] = useState(createBackend);
  const setReady = useGame((s) => s.setReady);
  const setProfile = useGame((s) => s.setProfile);
  const setDay = useGame((s) => s.setDay);
  const setError = useGame((s) => s.setError);

  useEffect(() => {
    let off: (() => void) | undefined;
    let cancelled = false;
    (async () => {
      try {
        await backend.init();
        const profile = await backend.getProfile();
        if (cancelled) return;
        setProfile(profile);
        off = backend.subscribeDay(setDay);
        setReady(true);
      } catch (error) {
        if (!cancelled) setError(error instanceof Error ? error.message : String(error));
      }
    })();
    return () => {
      cancelled = true;
      off?.();
    };
  }, [backend, setDay, setError, setProfile, setReady]);

  return <BackendContext.Provider value={backend}>{children}</BackendContext.Provider>;
}

export function useBackend(): GameBackend {
  const backend = useContext(BackendContext);
  if (!backend) throw new Error('useBackend must be used inside <BackendProvider>');
  return backend;
}
