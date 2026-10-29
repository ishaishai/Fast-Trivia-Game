import { useEffect, useState } from 'react';
import { useBackend } from '@/backend/BackendProvider';

/**
 * Server time, re-rendering on a fixed beat aligned to the wall clock
 * (so every countdown on screen ticks together) and whenever the clock jumps.
 */
export function useNow(intervalMs = 1000): number {
  const backend = useBackend();
  const [now, setNow] = useState(() => backend.now());
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const t = backend.now();
      setNow(t);
      timer = setTimeout(tick, Math.max(16, intervalMs - (t % intervalMs)));
    };
    tick();
    const off = backend.onClockChange(() => setNow(backend.now()));
    return () => {
      clearTimeout(timer);
      off();
    };
  }, [backend, intervalMs]);
  return now;
}
