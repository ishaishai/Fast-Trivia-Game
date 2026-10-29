import { View } from 'react-native';
import Svg, { Circle, ClipPath, Defs, G, Rect } from 'react-native-svg';
import { mulberry32 } from '@shared/random';
import { LIGHTS, LIGHT_ORDER } from '@/theme/palette';

/**
 * A generated sun glyph — every player gets their own sky: a light state,
 * a sun at a particular height, an eclipse at a particular phase.
 */
export function Avatar({ seed, size = 40, ring }: { seed: number; size?: number; ring?: string }) {
  const rng = mulberry32(seed + 17);
  const light = LIGHTS[LIGHT_ORDER[Math.floor(rng() * LIGHT_ORDER.length)]];
  const sunY = 42 + rng() * 22;
  const r = 20 + rng() * 6;
  const phase = (rng() - 0.5) * 2;
  const tilt = rng() * 40 - 20;
  const horizon = rng() > 0.45;
  const id = `av-${seed}`;
  return (
    <View pointerEvents="none" aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <ClipPath id={id}>
          <Circle cx="50" cy="50" r="50" />
        </ClipPath>
      </Defs>
      <G clipPath={`url(#${id})`}>
        <Rect x="0" y="0" width="100" height="100" fill={light.field} />
        <Circle cx="50" cy={sunY} r={r} fill={light.sun} />
        <Circle
          cx={50 + phase * r * 1.35 + Math.sin((tilt * Math.PI) / 180) * 4}
          cy={sunY - Math.cos((tilt * Math.PI) / 180) * 3}
          r={r}
          fill={light.field}
          opacity={Math.abs(phase) < 0.25 ? 0 : 1}
        />
        {horizon ? <Rect x="0" y="78" width="100" height="22" fill={light.deep} /> : null}
        <Rect x="49" y="8" width="2" height="84" fill={light.ink} opacity={0.7} />
      </G>
      {ring ? <Circle cx="50" cy="50" r="48.5" stroke={ring} strokeWidth="3" fill="none" /> : null}
    </Svg>
    </View>
  );
}
