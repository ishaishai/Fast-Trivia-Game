import { View } from 'react-native';
import { SESSIONS } from '@shared/schedule';
import type { CompetitionKind, LightState } from '@shared/types';
import { LIGHTS, WHITE } from '@/theme/palette';
import { Gradient } from '../ui/Gradient';

/** Where the sun sits in each session's little sky. */
const SUN: Record<CompetitionKind, { x: number; y: number; r: number }> = {
  daily: { x: 0.5, y: 0.42, r: 0.26 },
  firstlight: { x: 0.5, y: 0.86, r: 0.24 },
  zenith: { x: 0.5, y: 0.3, r: 0.22 },
  bluehour: { x: 0.72, y: 0.78, r: 0.2 },
};

/** A square of sky painted in a session's world, its sun at that hour. */
export function SessionTile({ kind, size = 60 }: { kind: CompetitionKind; size?: number }) {
  const def = SESSIONS[kind].light;
  const name: LightState = def === 'live' ? 'zenith' : def;
  const light = LIGHTS[name];
  const sun = SUN[kind];
  const r = sun.r * size;
  return (
    <Gradient
      colors={light.sky}
      style={{ width: size, height: size, borderRadius: size * 0.3, overflow: 'hidden', boxShadow: `0px 3px 0px 0px ${light.shadow}` }}
      aria-hidden
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View style={{ position: 'absolute', left: sun.x * size - r * 1.6, top: sun.y * size - r * 1.6, width: r * 3.2, height: r * 3.2, borderRadius: r * 2, backgroundColor: light.glow }} />
      <View style={{ position: 'absolute', left: sun.x * size - r, top: sun.y * size - r, width: r * 2, height: r * 2, borderRadius: r, backgroundColor: light.sun }} />
      {kind === 'bluehour' ? (
        <View style={{ position: 'absolute', left: size * 0.2, top: size * 0.22, width: 4, height: 4, borderRadius: 2, backgroundColor: WHITE, opacity: 0.8 }} />
      ) : null}
    </Gradient>
  );
}
