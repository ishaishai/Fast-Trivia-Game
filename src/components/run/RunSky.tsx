import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { Grain } from '../ui/bits';
import type { RunPhase } from '@/run/useRunController';
import { SKY_DEEP, SKY_FIELD, SKY_STOPS, SKY_SUN } from './sky';

/**
 * The run's sky. Its colour travels sunrise → midnight with the run clock;
 * the sun crosses on an arc; each question's three seconds is an eclipse
 * sliding across the sun.
 */
export function RunSky({
  day,
  eclipse,
  dusk,
  width,
  height,
  sunSize,
  phase,
  floor = 0,
  ceiling = 0,
  children,
}: {
  day: SharedValue<number>;
  eclipse: SharedValue<number>;
  dusk: SharedValue<number>;
  width: number;
  height: number;
  sunSize: number;
  phase: RunPhase;
  /** px kept clear at the bottom (the clock and score) */
  floor?: number;
  /** px kept clear at the top (the top bar) */
  ceiling?: number;
  children?: ReactNode;
}) {
  const rise = useSharedValue(0.12);
  useEffect(() => {
    if (phase === 'intro') rise.value = withTiming(1, { duration: 2200, easing: Easing.out(Easing.cubic) });
    else if (phase !== 'ready' && phase !== 'starting') rise.value = 1;
  }, [phase, rise]);

  const pad = Math.max(16, width * 0.06);
  const lowY = height - floor - sunSize / 2 - 8;
  const highY = Math.min(lowY, ceiling + sunSize / 2 + 8);
  const amp = lowY - highY;

  const sky = useAnimatedStyle(() => ({ backgroundColor: interpolateColor(day.value, SKY_STOPS, SKY_FIELD) }));
  const ground = useAnimatedStyle(() => ({ backgroundColor: interpolateColor(day.value, SKY_STOPS, SKY_DEEP) }));
  const sunPos = useAnimatedStyle(() => {
    const p = Math.min(1, Math.max(0, day.value));
    const x = pad + p * (width - pad * 2 - sunSize);
    const centre = lowY - Math.sin(p * Math.PI) * amp;
    const y = centre + (1 - rise.value) * sunSize * 0.8 + dusk.value * sunSize;
    return {
      opacity: Math.max(0, Math.min(1, rise.value * 1.2)) * (1 - dusk.value),
      transform: [{ translateX: x }, { translateY: y - sunSize / 2 }],
    };
  });
  const sunFill = useAnimatedStyle(() => ({ backgroundColor: interpolateColor(day.value, SKY_STOPS, SKY_SUN) }));
  const glow = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(day.value, SKY_STOPS, SKY_SUN),
    opacity: 0.1 + (1 - eclipse.value) * 0.08,
  }));
  const glowOuter = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(day.value, SKY_STOPS, SKY_SUN),
    opacity: 0.05 + (1 - eclipse.value) * 0.04,
  }));
  const moon = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(day.value, SKY_STOPS, SKY_FIELD),
    transform: [{ translateX: (eclipse.value - 1) * sunSize * 1.06 }],
  }));
  const corona = useAnimatedStyle(() => {
    const t = Math.min(1, Math.max(0, (eclipse.value - 0.8) / 0.2));
    return {
      borderColor: interpolateColor(day.value, SKY_STOPS, SKY_SUN),
      opacity: t,
      transform: [{ scale: 1 + t * 0.05 }],
    };
  });

  const halo = sunSize * 1.6;
  const haloOuter = sunSize * 2.3;
  return (
    <Animated.View style={[{ width, height, overflow: 'hidden' }, sky]}>
      <Grain opacity={0.8} />
      {/* A faint band of land at the bottom of the sky. */}
      <Animated.View style={[{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 18, opacity: 0.55 }, ground]} />
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, width: sunSize, height: sunSize }, sunPos]}>
        <Animated.View
          style={[
            {
              position: 'absolute',
              left: (sunSize - haloOuter) / 2,
              top: (sunSize - haloOuter) / 2,
              width: haloOuter,
              height: haloOuter,
              borderRadius: haloOuter / 2,
            },
            glowOuter,
          ]}
        />
        <Animated.View
          style={[
            { position: 'absolute', left: (sunSize - halo) / 2, top: (sunSize - halo) / 2, width: halo, height: halo, borderRadius: halo / 2 },
            glow,
          ]}
        />
        <Animated.View
          style={[
            { position: 'absolute', left: -6, top: -6, width: sunSize + 12, height: sunSize + 12, borderRadius: (sunSize + 12) / 2, borderWidth: 2 },
            corona,
          ]}
        />
        <Animated.View style={[{ width: sunSize, height: sunSize, borderRadius: sunSize / 2, overflow: 'hidden' }, sunFill]}>
          <Animated.View style={[StyleSheet.absoluteFill, { borderRadius: sunSize / 2 }, moon]} />
        </Animated.View>
      </Animated.View>
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        {children}
      </View>
    </Animated.View>
  );
}

/** The horizon doubles as a fuse: it burns down with the question's three seconds. */
export function Horizon({ eclipse, day, width }: { eclipse: SharedValue<number>; day: SharedValue<number>; width: number }) {
  const fuse = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(day.value, SKY_STOPS, SKY_SUN),
    transform: [{ scaleX: Math.max(0, 1 - eclipse.value) }],
  }));
  return (
    <View style={{ width, height: 3, backgroundColor: 'rgba(243,244,255,0.10)' }} aria-hidden>
      <Animated.View style={[{ position: 'absolute', left: 0, top: 0, bottom: 0, width, transformOrigin: 'left' }, fuse]} />
    </View>
  );
}
