import { useEffect, type ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { loops, springs, stagger, useMotionOK } from '@/theme/motion';
import { useSection } from './ScrollScene';

/**
 * Pops its children in with a springy overshoot once their section scrolls
 * into view (or on mount outside a ScrollScene). `index` staggers siblings.
 */
export function PopIn({
  children,
  delay = 0,
  index = 0,
  step = stagger.list,
  from = 0.86,
  rise = 14,
  style,
}: {
  children: ReactNode;
  delay?: number;
  index?: number;
  step?: number;
  /** starting scale */
  from?: number;
  /** starting offset below the resting place, px */
  rise?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const section = useSection();
  const motion = useMotionOK();
  const p = useSharedValue(motion ? 0 : 1);
  const fallback = useSharedValue(1);
  const source = section?.inView ?? fallback;
  useAnimatedReaction(
    () => source.value,
    (v) => {
      if (v === 1 && p.value === 0) p.value = withDelay(delay + index * step, withSpring(1, springs.pop));
    },
  );
  const animated = useAnimatedStyle(() => ({
    opacity: Math.min(1, p.value * 1.8),
    transform: [{ translateY: (1 - p.value) * rise }, { scale: from + (1 - from) * p.value }],
  }));
  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}

/** A repeating 0 → 1 → 0 wave; sits still at 0.5 under reduced motion or when inactive. */
function useWave(period: number, delay: number, active: boolean): SharedValue<number> {
  const motion = useMotionOK();
  const t = useSharedValue(0.5);
  const run = motion && active;
  useEffect(() => {
    if (!run) {
      cancelAnimation(t);
      t.set(withTiming(0.5, { duration: 200 }));
      return;
    }
    t.set(0);
    t.set(withDelay(delay, withRepeat(withTiming(1, { duration: period / 2, easing: Easing.inOut(Easing.sin) }), -1, true)));
    return () => cancelAnimation(t);
  }, [delay, period, run, t]);
  return t;
}

/** Bobs gently up and down, as if floating. */
export function Float({
  children,
  amplitude = 6,
  period = loops.bob,
  delay = 0,
  rotate = 0,
  active = true,
  style,
}: {
  children: ReactNode;
  amplitude?: number;
  period?: number;
  delay?: number;
  /** degrees of sway either side */
  rotate?: number;
  active?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useWave(period, delay, active);
  const animated = useAnimatedStyle(() => {
    const k = (t.value - 0.5) * 2;
    return { transform: [{ translateY: k * amplitude }, { rotate: `${k * rotate}deg` }] };
  });
  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}

/** Breathes in and out to say "press me". */
export function Pulse({
  children,
  scale = 1.05,
  period = loops.pulse,
  active = true,
  style,
}: {
  children: ReactNode;
  scale?: number;
  period?: number;
  active?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useWave(period, 0, active);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: 1 + (scale - 1) * t.value }] }));
  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}

/** Wiggles once every time `trigger` changes. */
export function Wiggle({ children, trigger, angle = 7, style }: { children: ReactNode; trigger: number; angle?: number; style?: StyleProp<ViewStyle> }) {
  const motion = useMotionOK();
  const r = useSharedValue(0);
  useEffect(() => {
    if (!motion || !trigger) return;
    r.set(
      withSequence(
        withTiming(-angle, { duration: 70 }),
        withTiming(angle, { duration: 110 }),
        withTiming(-angle * 0.6, { duration: 100 }),
        withSpring(0, springs.wobble),
      ),
    );
  }, [angle, motion, r, trigger]);
  const animated = useAnimatedStyle(() => ({ transform: [{ rotate: `${r.value}deg` }] }));
  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}

/**
 * Press feedback for a face inside a Tap: squashes down while held and
 * springs back past its size on release.
 */
export function useSquish(pressed: boolean, to = 0.95) {
  const motion = useMotionOK();
  const s = useSharedValue(1);
  useEffect(() => {
    if (!motion) {
      s.set(withTiming(pressed ? 0.98 : 1, { duration: 90 }));
      return;
    }
    s.set(withSpring(pressed ? to : 1, pressed ? springs.press : springs.release));
  }, [motion, pressed, s, to]);
  return useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
}

/**
 * One looping 0 → 1 clock (linear) that many decorations can read, so a whole
 * backdrop costs one animation. Stops under reduced motion or when inactive.
 */
export function useAmbientClock(period: number, active: boolean): SharedValue<number> {
  const motion = useMotionOK();
  const t = useSharedValue(0);
  const run = motion && active;
  useEffect(() => {
    if (!run) {
      cancelAnimation(t);
      return;
    }
    const from = t.get() % 1;
    t.set(from);
    t.set(
      withSequence(
        withTiming(1, { duration: period * (1 - from), easing: Easing.linear }),
        withRepeat(withSequence(withTiming(0, { duration: 0 }), withTiming(1, { duration: period, easing: Easing.linear })), -1, false),
      ),
    );
    return () => cancelAnimation(t);
  }, [period, run, t]);
  return t;
}
