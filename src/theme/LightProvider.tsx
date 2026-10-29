import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { localZone, lightForMinutes } from '@shared/schedule';
import type { LightState } from '@shared/types';
import { BACKEND_KIND } from '@/backend';
import { useNow } from '@/hooks/useNow';
import { useSettings } from '@/stores/settings';
import { LIGHTS, surfaceOf, type Light } from './palette';
import { applyWebStyles } from './webStyles';

const LightContext = createContext<Light>(LIGHTS.bluehour);
const AmbientContext = createContext<LightState>('bluehour');

/** The light of the player's actual time of day — the app looks different at 8 am and 8 pm. */
export function AmbientLight({ children }: { children: ReactNode }) {
  const now = useNow(15_000);
  const override = useSettings((s) => s.lightOverride);
  const name: LightState = (BACKEND_KIND === 'mock' && override) || lightForMinutes(localZone.minutesOf(now));
  const light = LIGHTS[name];
  useEffect(() => applyWebStyles(light), [light]);
  return (
    <AmbientContext.Provider value={name}>
      <LightContext.Provider value={light}>{children}</LightContext.Provider>
    </AmbientContext.Provider>
  );
}

/** Paint a subtree in a specific light (a session lobby, the results at midnight). */
export function LightScope({ name, children }: { name: LightState; children: ReactNode }) {
  return <LightContext.Provider value={LIGHTS[name]}>{children}</LightContext.Provider>;
}

/**
 * Everything inside a card reads the card's colours (white, dark ink) while
 * keeping the world's sun and shadow. Put LightScope outside, CardScope inside.
 */
export function CardScope({ children }: { children: ReactNode }) {
  const light = useLight();
  const value = useMemo(() => surfaceOf(light), [light]);
  return <LightContext.Provider value={value}>{children}</LightContext.Provider>;
}

export function useLight(): Light {
  return useContext(LightContext);
}

/** True inside a card. */
export function onCard(light: Light): boolean {
  return light.field === light.card.field;
}

export function useAmbientLight(): LightState {
  return useContext(AmbientContext);
}
