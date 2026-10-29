import { useIsFocused } from 'expo-router';
import { StyleSheet, View, useWindowDimensions, type DimensionValue } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { useLight } from '@/theme/LightProvider';
import { loops } from '@/theme/motion';
import { DECOR, WHITE, type Decor, type Light } from '@/theme/palette';
import { useAmbientClock } from '../motion/Playful';
import { Gradient } from '../ui/Gradient';

const TAU = Math.PI * 2;

/**
 * The sky behind every screen: the world's gradient plus a few drifting
 * decorations (clouds, a turning sunburst, sparkles, stars) and floating
 * pixels. One clock drives all of it; it stops when the screen isn't
 * focused or the player asked for less motion.
 */
export function WorldBackdrop({ light: override, active = true }: { light?: Light; active?: boolean }) {
  const ambient = useLight();
  const light = override ?? ambient;
  const focused = useIsFocused();
  const t = useAmbientClock(loops.drift, active && focused);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Gradient colors={light.sky} style={StyleSheet.absoluteFill} />
      <WorldDecor kind={light.decor} t={t} dark={light.statusBar === 'light'} />
    </View>
  );
}

export function WorldDecor({ kind, t, dark, height: box }: { kind: Decor; t: SharedValue<number>; dark: boolean; height?: number }) {
  const window = useWindowDimensions();
  const height = box ?? window.height;
  return (
    <>
      {kind === 'rays' ? <Sunburst t={t} /> : null}
      {kind === 'clouds' || kind === 'rays' ? (
        <>
          <Cloud t={t} top="7%" left="-8%" size={150} phase={0} />
          <Cloud t={t} top="16%" left="64%" size={104} phase={0.35} />
          {kind === 'clouds' ? <Cloud t={t} top="52%" left="78%" size={128} phase={0.6} /> : null}
          <Cloud t={t} top="74%" left="-4%" size={92} phase={0.8} />
        </>
      ) : null}
      {kind === 'sparkles' ? SPARKLES.map((s, i) => <Sparkle key={i} t={t} {...s} />) : null}
      {kind === 'stars' ? (
        <>
          {STARS.map((s, i) => (
            <Star key={i} t={t} {...s} />
          ))}
          <Moon />
        </>
      ) : null}
      {PIXELS.map((p, i) => (
        <Pixel key={i} t={t} {...p} travel={height + 120} color={dark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(255, 255, 255, 0.5)'} />
      ))}
    </>
  );
}

type Spot = { top: DimensionValue; left: DimensionValue; size: number; phase: number };

const SPARKLES: Spot[] = [
  { top: '6%', left: '12%', size: 22, phase: 0 },
  { top: '12%', left: '80%', size: 16, phase: 0.3 },
  { top: '30%', left: '6%', size: 12, phase: 0.55 },
  { top: '38%', left: '88%', size: 20, phase: 0.15 },
  { top: '58%', left: '18%', size: 14, phase: 0.7 },
  { top: '66%', left: '72%', size: 24, phase: 0.45 },
  { top: '84%', left: '40%', size: 14, phase: 0.85 },
  { top: '90%', left: '86%', size: 12, phase: 0.25 },
];

const STARS: Spot[] = [
  { top: '4%', left: '8%', size: 3, phase: 0 },
  { top: '9%', left: '34%', size: 2, phase: 0.4 },
  { top: '14%', left: '58%', size: 4, phase: 0.7 },
  { top: '6%', left: '70%', size: 2, phase: 0.2 },
  { top: '22%', left: '16%', size: 2, phase: 0.9 },
  { top: '28%', left: '82%', size: 3, phase: 0.5 },
  { top: '36%', left: '44%', size: 2, phase: 0.1 },
  { top: '44%', left: '6%', size: 4, phase: 0.65 },
  { top: '52%', left: '92%', size: 2, phase: 0.35 },
  { top: '61%', left: '30%', size: 3, phase: 0.8 },
  { top: '70%', left: '66%', size: 2, phase: 0.05 },
  { top: '78%', left: '12%', size: 3, phase: 0.55 },
  { top: '86%', left: '52%', size: 2, phase: 0.3 },
  { top: '92%', left: '84%', size: 4, phase: 0.75 },
];

const PIXELS: { left: DimensionValue; size: number; phase: number; speed: number }[] = [
  { left: '10%', size: 14, phase: 0, speed: 1 },
  { left: '30%', size: 10, phase: 0.45, speed: 2 },
  { left: '55%', size: 16, phase: 0.2, speed: 1 },
  { left: '74%', size: 12, phase: 0.7, speed: 2 },
  { left: '90%', size: 10, phase: 0.35, speed: 1 },
];

function Cloud({ t, top, left, size, phase }: Spot & { t: SharedValue<number> }) {
  const animated = useAnimatedStyle(() => ({ transform: [{ translateX: Math.sin((t.value + phase) * TAU) * 22 }] }));
  return (
    <Animated.View style={[{ position: 'absolute', top, left }, animated]}>
      <Svg width={size} height={size * 0.5} viewBox="0 0 120 60">
        <Rect x="8" y="30" width="104" height="26" rx="13" fill={WHITE} opacity={0.9} />
        <Circle cx="38" cy="32" r="18" fill={WHITE} opacity={0.9} />
        <Circle cx="66" cy="26" r="22" fill={WHITE} opacity={0.9} />
        <Circle cx="92" cy="36" r="14" fill={WHITE} opacity={0.9} />
      </Svg>
    </Animated.View>
  );
}

function Sunburst({ t }: { t: SharedValue<number> }) {
  const animated = useAnimatedStyle(() => ({ transform: [{ rotate: `${t.value * 360}deg` }] }));
  const rays = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * TAU;
    const b = a + TAU / 24;
    const r = 100;
    return `M100 100 L${100 + Math.cos(a) * r} ${100 + Math.sin(a) * r} L${100 + Math.cos(b) * r} ${100 + Math.sin(b) * r} Z`;
  }).join(' ');
  return (
    <Animated.View style={[{ position: 'absolute', top: -260, right: -260, width: 560, height: 560 }, animated]}>
      <Svg width={560} height={560} viewBox="0 0 200 200">
        <Path d={rays} fill={WHITE} opacity={0.16} />
      </Svg>
    </Animated.View>
  );
}

const SPARKLE = 'M12 0 C13 8 16 11 24 12 C16 13 13 16 12 24 C11 16 8 13 0 12 C8 11 11 8 12 0 Z';

function Sparkle({ t, top, left, size, phase }: Spot & { t: SharedValue<number> }) {
  const twinkles = loops.drift / loops.twinkle;
  const animated = useAnimatedStyle(() => {
    const k = Math.abs(Math.sin((t.value * twinkles + phase) * Math.PI));
    return { opacity: 0.35 + k * 0.6, transform: [{ scale: 0.6 + k * 0.5 }, { rotate: `${k * 30}deg` }] };
  });
  return (
    <Animated.View style={[{ position: 'absolute', top, left }, animated]}>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d={SPARKLE} fill={DECOR.sparkle} />
      </Svg>
    </Animated.View>
  );
}

function Star({ t, top, left, size, phase }: Spot & { t: SharedValue<number> }) {
  const twinkles = loops.drift / loops.twinkle;
  const animated = useAnimatedStyle(() => ({ opacity: 0.3 + Math.abs(Math.sin((t.value * twinkles + phase) * Math.PI)) * 0.7 }));
  return <Animated.View style={[{ position: 'absolute', top, left, width: size, height: size, borderRadius: size, backgroundColor: WHITE }, animated]} />;
}

function Moon() {
  return (
    <View style={{ position: 'absolute', top: 56, right: 28 }}>
      <Svg width={46} height={46} viewBox="0 0 46 46">
        <Path d="M30 4a19 19 0 1 0 12 30A16 16 0 0 1 30 4z" fill={DECOR.moon} opacity={0.85} />
      </Svg>
    </View>
  );
}

/** A rounded pixel rising slowly up the sky and fading at both ends. */
function Pixel({
  t,
  left,
  size,
  phase,
  speed,
  travel,
  color,
}: {
  t: SharedValue<number>;
  left: DimensionValue;
  size: number;
  phase: number;
  speed: number;
  travel: number;
  color: string;
}) {
  const animated = useAnimatedStyle(() => {
    const p = (t.value * speed + phase) % 1;
    return {
      opacity: Math.min(1, p * 5, (1 - p) * 5),
      transform: [{ translateY: (1 - p) * travel - 60 }, { rotate: `${p * 90}deg` }],
    };
  });
  return <Animated.View style={[{ position: 'absolute', top: 0, left, width: size, height: size, borderRadius: size * 0.28, backgroundColor: color }, animated]} />;
}
