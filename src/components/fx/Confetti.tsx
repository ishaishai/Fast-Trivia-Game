import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { mulberry32 } from '@shared/random';
import { fx, useMotionOK } from '@/theme/motion';

const COLORS = ['#FFC83D', '#FF5FA2', '#4FB8FF', '#8A3FE0', '#2BD46A', '#FF9A1F'];

interface Bit {
  x: number;
  vx: number;
  vy: number;
  size: number;
  long: boolean;
  spin: number;
  sway: number;
  color: string;
  delay: number;
}

/**
 * A celebration: confetti thrown up from the bottom of the screen that
 * flutters back down. Fires each time `fire` changes to a new non-zero
 * number. Nothing shows under reduced motion.
 */
export function Confetti({ fire, count = 28, colors = COLORS, duration = 2200 }: { fire: number; count?: number; colors?: readonly string[]; duration?: number }) {
  const motion = useMotionOK();
  // The volley that has already landed; a new `fire` throws another.
  const [landed, setLanded] = useState(0);
  if (!motion || !fire || fire === landed) return null;
  return <Volley key={fire} seed={fire} count={Math.min(count, fx.maxConfetti)} colors={colors} duration={duration} onDone={() => setLanded(fire)} />;
}

function Volley({ seed, count, colors, duration, onDone }: { seed: number; count: number; colors: readonly string[]; duration: number; onDone: () => void }) {
  const { width, height } = useWindowDimensions();
  const p = useSharedValue(0);
  const bits = useMemo<Bit[]>(() => {
    // Seeded, so a re-render never reshuffles a volley mid-flight.
    const random = mulberry32(seed * 7919);
    return Array.from({ length: count }, (_, i) => {
        const fromLeft = i % 2 === 0;
        return {
          x: fromLeft ? width * (0.05 + random() * 0.2) : width * (0.75 + random() * 0.2),
          vx: (fromLeft ? 1 : -1) * width * (0.15 + random() * 0.35),
          vy: -height * (0.75 + random() * 0.35),
          size: 8 + random() * 7,
          long: random() > 0.5,
          spin: (random() - 0.5) * 900,
          sway: 10 + random() * 20,
          color: colors[i % colors.length] ?? '#FFFFFF',
          delay: random() * 0.12,
        };
      });
  }, [colors, count, height, seed, width]);
  useEffect(() => {
    p.set(
      withTiming(1, { duration, easing: Easing.linear }, (finished) => {
        if (finished) scheduleOnRN(onDone);
      }),
    );
  }, [duration, onDone, p]);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {bits.map((bit, i) => (
        <Piece key={i} p={p} bit={bit} floor={height} />
      ))}
    </View>
  );
}

function Piece({ p, bit, floor }: { p: SharedValue<number>; bit: Bit; floor: number }) {
  const animated = useAnimatedStyle(() => {
    const t = Math.max(0, (p.value - bit.delay) / (1 - bit.delay));
    // Thrown up, slowed by gravity and air, fluttering on the way down.
    const g = 2.1 * floor;
    const y = floor + 20 + bit.vy * t + 0.5 * g * t * t;
    const x = bit.x + bit.vx * t + Math.sin(t * 14) * bit.sway * t;
    return {
      opacity: t <= 0 ? 0 : t > 0.85 ? (1 - t) / 0.15 : 1,
      transform: [{ translateX: x }, { translateY: y }, { rotate: `${bit.spin * t}deg` }, { scaleY: Math.cos(t * 18) }],
    };
  });
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: 0,
          top: 0,
          width: bit.long ? bit.size * 0.55 : bit.size,
          height: bit.long ? bit.size * 1.6 : bit.size,
          borderRadius: bit.long ? 2 : bit.size * 0.3,
          backgroundColor: bit.color,
        },
        animated,
      ]}
    />
  );
}
