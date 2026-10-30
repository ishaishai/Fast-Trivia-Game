import { useIsFocused } from 'expo-router';
import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Extrapolation,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Rect } from 'react-native-svg';
import type { RunPhase } from '@/run/useRunController';
import { LIGHTS, MOON, SIGNAL, SUNNY } from '@/theme/palette';
import { Sunny, type Mood } from '../brand/Sunny';
import { useAmbientClock } from '../motion/Playful';
import { Gradient } from '../ui/Gradient';
import { SKY_LAYERS, SKY_STOPS, SKY_SUN } from './sky';

/** The whole run screen's sky: morning's gradient, with each later world fading in over it as the run goes on. */
export function RunBackdrop({ day }: { day: SharedValue<number> }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Gradient colors={LIGHTS.firstlight.sky} style={StyleSheet.absoluteFill} />
      {SKY_LAYERS.map((layer) => (
        <Layer key={layer.light} day={day} {...layer} />
      ))}
    </View>
  );
}

function Layer({ day, light, from, to }: { day: SharedValue<number>; light: keyof typeof LIGHTS; from: number; to: number }) {
  const fade = useAnimatedStyle(() => ({ opacity: interpolate(day.value, [from, to], [0, 1], Extrapolation.CLAMP) }));
  return (
    <Animated.View style={[StyleSheet.absoluteFill, fade]}>
      <Gradient colors={LIGHTS[light].sky} style={StyleSheet.absoluteFill} />
    </Animated.View>
  );
}

/**
 * The band of sky the sun crosses. Sunny travels an arc with the run clock;
 * each question's five seconds is a moon sliding across Sunny's face.
 */
export function RunSky({
  day,
  eclipse,
  dusk,
  width,
  height,
  sunSize,
  phase,
  mood,
  floor = 0,
  ceiling = 0,
  children,
}: {
  day: SharedValue<number>;
  eclipse: SharedValue<number>;
  dusk: SharedValue<number>;
  width: number;
  height: number;
  /** diameter of Sunny's face */
  sunSize: number;
  phase: RunPhase;
  mood: Mood;
  /** px kept clear at the bottom (the clock and score) */
  floor?: number;
  /** px kept clear at the top (the top bar) */
  ceiling?: number;
  children?: ReactNode;
}) {
  const focused = useIsFocused();
  const rise = useSharedValue(0.12);
  useEffect(() => {
    if (phase === 'intro') rise.set(withTiming(1, { duration: 2200, easing: Easing.out(Easing.cubic) }));
    else if (phase !== 'ready' && phase !== 'starting') rise.set(1);
  }, [phase, rise]);
  const turn = useAmbientClock(14000, focused);

  const ray = sunSize * 1.62;
  const pad = Math.max(16, width * 0.06);
  const lowY = height - floor - sunSize / 2 - 8;
  const highY = Math.min(lowY, ceiling + sunSize / 2 + 8);
  const amp = lowY - highY;

  const sunPos = useAnimatedStyle(() => {
    const p = Math.min(1, Math.max(0, day.value));
    const x = pad + (ray - sunSize) / 2 + p * (width - pad * 2 - ray);
    const centre = lowY - Math.sin(p * Math.PI) * amp;
    const y = centre + (1 - rise.value) * sunSize * 0.9 + dusk.value * sunSize;
    return {
      opacity: Math.max(0, Math.min(1, rise.value * 1.2)) * (1 - dusk.value),
      transform: [{ translateX: x }, { translateY: y - sunSize / 2 }],
    };
  });
  const rays = useAnimatedStyle(() => ({
    opacity: 1 - eclipse.value * 0.55,
    transform: [{ rotate: `${turn.value * 360}deg` }, { scale: 1 - eclipse.value * 0.12 }],
  }));
  const glow = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(day.value, SKY_STOPS, SKY_SUN),
    opacity: 0.22 * (1 - eclipse.value),
  }));
  const moon = useAnimatedStyle(() => ({ transform: [{ translateX: (eclipse.value - 1) * sunSize * 1.08 }] }));
  const corona = useAnimatedStyle(() => {
    const t = Math.min(1, Math.max(0, (eclipse.value - 0.72) / 0.28));
    return { opacity: t, transform: [{ scale: 1.02 + t * 0.08 }] };
  });

  const face = sunSize / 0.767;
  return (
    <View style={{ width, height, overflow: 'hidden' }}>
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, width: sunSize, height: sunSize }, sunPos]} aria-hidden>
        <Animated.View
          style={[{ position: 'absolute', left: -sunSize * 0.3, top: -sunSize * 0.3, width: sunSize * 1.6, height: sunSize * 1.6, borderRadius: sunSize }, glow]}
        />
        <Animated.View style={[{ position: 'absolute', left: (sunSize - ray) / 2, top: (sunSize - ray) / 2, width: ray, height: ray }, rays]}>
          <Svg width={ray} height={ray} viewBox="0 0 120 120">
            {Array.from({ length: 12 }, (_, i) => (
              <Rect key={i} x="55" y="1" width="10" height="20" rx="5" fill={SUNNY.body} transform={`rotate(${i * 30} 60 60)`} />
            ))}
          </Svg>
        </Animated.View>
        <Animated.View
          style={[
            { position: 'absolute', left: -5, top: -5, width: sunSize + 10, height: sunSize + 10, borderRadius: sunSize, borderWidth: 4, borderColor: SIGNAL.warn },
            corona,
          ]}
        />
        <View style={{ width: sunSize, height: sunSize, borderRadius: sunSize / 2, overflow: 'hidden', backgroundColor: SUNNY.body }}>
          <View style={{ position: 'absolute', left: (sunSize - face) / 2, top: (sunSize - face) / 2 }}>
            <Sunny size={face} mood={mood} rays={false} color={SUNNY.body} />
          </View>
          <Animated.View style={[StyleSheet.absoluteFill, moon]}>
            <Svg width={sunSize} height={sunSize} viewBox="0 0 100 100">
              <Circle cx="50" cy="50" r="50" fill={MOON.face} />
              <Circle cx="34" cy="36" r="9" fill={MOON.crater} />
              <Circle cx="62" cy="62" r="13" fill={MOON.crater} />
              <Circle cx="70" cy="30" r="5" fill={MOON.crater} />
            </Svg>
          </Animated.View>
        </View>
      </Animated.View>
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        {children}
      </View>
    </View>
  );
}
