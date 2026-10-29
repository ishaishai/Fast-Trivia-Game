import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { onCard, useLight } from '@/theme/LightProvider';
import { useMotionOK } from '@/theme/motion';
import { SIGNAL, WHITE } from '@/theme/palette';
import { Icon, type IconName } from '../icons';
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

/** Small pill label. On the sky a solid chip is white; on a card it is a lavender well. */
export function Chip({
  children,
  tone = 'solid',
  dot,
  icon,
  style,
}: {
  children: ReactNode;
  tone?: 'line' | 'sun' | 'solid' | 'good';
  dot?: boolean;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
}) {
  const light = useLight();
  const card = onCard(light);
  const bg =
    tone === 'sun' ? light.sun : tone === 'good' ? SIGNAL.correct : tone === 'solid' ? (card ? light.card.deep : WHITE) : 'transparent';
  const fg = tone === 'sun' ? light.onSun : tone === 'good' ? SIGNAL.onCorrect : tone === 'solid' ? light.card.ink : light.ink;
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          alignSelf: 'flex-start',
          paddingHorizontal: 12,
          height: 30,
          borderRadius: 999,
          backgroundColor: bg,
          borderWidth: tone === 'line' ? 1.5 : 0,
          borderColor: light.line,
        },
        style,
      ]}
    >
      {dot ? <LiveDot color={tone === 'sun' ? light.onSun : tone === 'solid' ? SIGNAL.wrong : light.sun} size={7} /> : null}
      {icon ? <Icon name={icon} color={fg} size={16} strokeWidth={2.6} filled={icon === 'star' || icon === 'fire' || icon === 'bolt'} /> : null}
      <T v="label" color={fg}>
        {children}
      </T>
    </View>
  );
}

/** A round count bubble that sits on the corner of something (skips left, new crowns). */
export function Badge({ count, style }: { count: number | string; style?: StyleProp<ViewStyle> }) {
  const light = useLight();
  return (
    <View
      style={[
        {
          minWidth: 26,
          height: 26,
          paddingHorizontal: 7,
          borderRadius: 13,
          backgroundColor: light.sun,
          borderWidth: 2.5,
          borderColor: WHITE,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <T v="label" color={light.onSun} style={{ fontSize: 13, lineHeight: 16 }}>
        {String(count)}
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
