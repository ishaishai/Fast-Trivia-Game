import { useEffect, type ReactNode } from 'react';
import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useLight } from '@/theme/LightProvider';
import { useMotionOK } from '@/theme/motion';
import { T } from './Text';

/** A pulsing dot for anything happening right now. */
export function LiveDot({ color, size = 8 }: { color?: string; size?: number }) {
  const light = useLight();
  const motion = useMotionOK();
  const pulse = useSharedValue(0);
  useEffect(() => {
    if (!motion) return;
    pulse.value = withRepeat(withTiming(1, { duration: 1600, easing: Easing.out(Easing.quad) }), -1, false);
    return () => cancelAnimation(pulse);
  }, [motion, pulse]);
  const ring = useAnimatedStyle(() => ({ opacity: 0.55 * (1 - pulse.value), transform: [{ scale: 1 + pulse.value * 1.6 }] }));
  const c = color ?? light.sun;
  return (
    <View style={{ width: size, height: size }} accessibilityElementsHidden importantForAccessibility="no">
      <Animated.View style={[StyleSheet.absoluteFill, { borderRadius: size, backgroundColor: c }, ring]} />
      <View style={[StyleSheet.absoluteFill, { borderRadius: size, backgroundColor: c }]} />
    </View>
  );
}

/** Small pill label. */
export function Chip({
  children,
  tone = 'line',
  dot,
  style,
}: {
  children: ReactNode;
  tone?: 'line' | 'sun' | 'solid';
  dot?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const light = useLight();
  const bg = tone === 'sun' ? light.sun : tone === 'solid' ? light.raised : 'transparent';
  const fg = tone === 'sun' ? light.onSun : light.ink;
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          alignSelf: 'flex-start',
          paddingHorizontal: 12,
          height: 28,
          borderRadius: 999,
          backgroundColor: bg,
          borderWidth: tone === 'line' ? 1 : 0,
          borderColor: light.line,
        },
        style,
      ]}
    >
      {dot ? <LiveDot color={tone === 'sun' ? light.onSun : light.sun} size={7} /> : null}
      <T v="label" color={fg}>
        {children}
      </T>
    </View>
  );
}

/** Eyebrow: a small mono label that names what follows. */
export function Eyebrow({ children, color, style }: { children: ReactNode; color?: string; style?: StyleProp<ViewStyle> }) {
  const light = useLight();
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 10 }, style]}>
      <View style={{ width: 18, height: 1.5, backgroundColor: color ?? light.sun }} />
      <T v="label" color={color ?? light.ink}>
        {children}
      </T>
    </View>
  );
}

export function Hairline({ color, vertical, style }: { color?: string; vertical?: boolean; style?: StyleProp<ViewStyle> }) {
  const light = useLight();
  return (
    <View
      style={[
        vertical ? { width: StyleSheet.hairlineWidth * 2, alignSelf: 'stretch' } : { height: StyleSheet.hairlineWidth * 2, alignSelf: 'stretch' },
        { backgroundColor: color ?? light.line },
        style,
      ]}
    />
  );
}

/** Film grain over a surface — the tactile layer that keeps flat colour from feeling flat. */
export function Grain({ opacity = 1 }: { opacity?: number }) {
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity }]} aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Image source={require('../../../assets/grain.png')} resizeMode="repeat" style={{ width: '100%', height: '100%' }} />
    </View>
  );
}

/** Horizontal shake used for wrong answers. */
export function useShake() {
  const x = useSharedValue(0);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const shake = () => {
    x.set(withSequence(
      withTiming(-7, { duration: 45 }),
      withTiming(7, { duration: 70 }),
      withTiming(-5, { duration: 60 }),
      withTiming(4, { duration: 55 }),
      withTiming(0, { duration: 50 }),
    ));
  };
  return { style, shake };
}
