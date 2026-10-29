import { View } from 'react-native';
import Svg, { Circle, ClipPath, Defs, Ellipse, G, Path, Rect } from 'react-native-svg';
import { mulberry32 } from '@shared/random';
import { FACES, WHITE } from '@/theme/palette';

const INK = FACES.ink;

/**
 * Every player gets a little face of their own: a colour, eyes, a mouth and
 * sometimes a sprout or a bow, all from their seed. Decorative only.
 */
export function Avatar({ seed, size = 40, ring }: { seed: number; size?: number; ring?: string }) {
  const rng = mulberry32(seed + 17);
  const bg = FACES.colors[Math.floor(rng() * FACES.colors.length)];
  const eyes = Math.floor(rng() * 4);
  const mouth = Math.floor(rng() * 4);
  const extra = Math.floor(rng() * 5);
  const blush = rng() > 0.4;
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
          <Rect x="0" y="0" width="100" height="100" fill={bg} />
          <Circle cx="34" cy="28" r="16" fill={WHITE} opacity={0.25} />
          {blush ? (
            <>
              <Ellipse cx="26" cy="62" rx="8" ry="5" fill={FACES.cheek} opacity={0.45} />
              <Ellipse cx="74" cy="62" rx="8" ry="5" fill={FACES.cheek} opacity={0.45} />
            </>
          ) : null}
          <Eyes kind={eyes} />
          <Mouth kind={mouth} />
          {extra === 0 ? <Path d="M50 14 Q44 2 34 6 Q40 14 50 14 Z M50 14 Q56 2 66 6 Q60 14 50 14 Z" fill={FACES.sprout} /> : null}
          {extra === 1 ? (
            <G>
              <Path d="M50 16 L36 8 L36 24 Z" fill={FACES.bow} />
              <Path d="M50 16 L64 8 L64 24 Z" fill={FACES.bow} />
              <Circle cx="50" cy="16" r="4" fill={FACES.knot} />
            </G>
          ) : null}
        </G>
        {ring ? <Circle cx="50" cy="50" r="47.5" stroke={ring} strokeWidth="5" fill="none" /> : null}
      </Svg>
    </View>
  );
}

function Eyes({ kind }: { kind: number }) {
  switch (kind) {
    case 1:
      return (
        <G stroke={INK} strokeWidth="5" strokeLinecap="round" fill="none">
          <Path d="M28 48 Q35 40 42 48" />
          <Path d="M58 48 Q65 40 72 48" />
        </G>
      );
    case 2:
      return (
        <G>
          <Circle cx="35" cy="46" r="8" fill={WHITE} />
          <Circle cx="65" cy="46" r="8" fill={WHITE} />
          <Circle cx="36" cy="47" r="4.5" fill={INK} />
          <Circle cx="66" cy="47" r="4.5" fill={INK} />
        </G>
      );
    case 3:
      return (
        <G>
          <Ellipse cx="35" cy="46" rx="4.5" ry="6" fill={INK} />
          <Path d="M58 47 Q65 41 72 47" stroke={INK} strokeWidth="5" strokeLinecap="round" fill="none" />
        </G>
      );
    default:
      return (
        <G>
          <Ellipse cx="35" cy="46" rx="4.5" ry="6" fill={INK} />
          <Ellipse cx="65" cy="46" rx="4.5" ry="6" fill={INK} />
        </G>
      );
  }
}

function Mouth({ kind }: { kind: number }) {
  switch (kind) {
    case 1:
      return <Ellipse cx="50" cy="68" rx="6" ry="7" fill={INK} />;
    case 2:
      return (
        <G>
          <Path d="M36 62 Q50 80 64 62 Z" fill={INK} />
          <Path d="M43 70 Q50 66 57 70 Q50 75 43 70 Z" fill={FACES.cheek} />
        </G>
      );
    case 3:
      return <Path d="M40 66 Q45 71 50 66 Q55 71 60 66" stroke={INK} strokeWidth="4.5" strokeLinecap="round" fill="none" />;
    default:
      return <Path d="M38 64 Q50 76 62 64" stroke={INK} strokeWidth="5" strokeLinecap="round" fill="none" />;
  }
}
