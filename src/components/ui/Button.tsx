import type { Href } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View, type GestureResponderEvent, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useLight } from '@/theme/LightProvider';
import { useLayout } from '@/theme/layout';
import { dur, ease } from '@/theme/motion';
import { Icon, type IconName } from '../icons';
import { Tap, type TapState } from './Tap';

type Variant = 'sun' | 'ink' | 'ghost';
type Size = 'l' | 'm' | 's';

export interface ButtonProps {
  label: string;
  onPress?: (event: GestureResponderEvent) => void;
  href?: Href;
  variant?: Variant;
  size?: Size;
  icon?: IconName | null;
  iconLeft?: IconName;
  disabled?: boolean;
  loading?: boolean;
  /** Override colours when a button sits outside the page light (the run ground). */
  colors?: { bg: string; fg: string; hoverBg?: string; hoverFg?: string };
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  stretch?: boolean;
}

const HEIGHT: Record<Size, number> = { l: 60, m: 48, s: 36 };
const PAD: Record<Size, number> = { l: 28, m: 22, s: 16 };

/**
 * Pill buttons. Hover wipes a fill in from the left and nudges the arrow;
 * pressing sinks the pill slightly. Colours come from the current light.
 */
export function Button(props: ButtonProps) {
  return <ButtonBody {...props} />;
}

function ButtonBody({
  label,
  href,
  onPress,
  variant = 'sun',
  size = 'l',
  icon = variant === 'sun' ? 'arrow-right' : null,
  iconLeft,
  disabled,
  loading,
  colors,
  accessibilityLabel,
  accessibilityHint,
  style,
  stretch,
}: ButtonProps) {
  const light = useLight();
  const { type } = useLayout();
  const palette = colors ?? {
    sun: { bg: light.sun, fg: light.onSun, hoverBg: light.ink, hoverFg: light.field },
    ink: { bg: 'transparent', fg: light.ink, hoverBg: light.ink, hoverFg: light.field },
    ghost: { bg: 'transparent', fg: light.ink, hoverBg: 'transparent', hoverFg: light.sun },
  }[variant];
  const hoverBg = palette.hoverBg ?? palette.fg;
  const hoverFg = palette.hoverFg ?? palette.bg;

  return (
    <Tap
      href={disabled ? undefined : href}
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole={href ? 'link' : 'button'}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: Boolean(disabled), busy: Boolean(loading) }}
      style={[{ alignSelf: stretch ? 'stretch' : 'flex-start', borderRadius: 999 }, style]}
    >
      {(state) => (
        <ButtonFace
          state={state}
          label={label}
          icon={icon}
          iconLeft={iconLeft}
          size={size}
          variant={variant}
          disabled={disabled}
          loading={loading}
          bg={palette.bg}
          fg={palette.fg}
          hoverBg={hoverBg}
          hoverFg={hoverFg}
          border={variant === 'ink' ? light.line : 'transparent'}
          labelStyle={type.title}
          stretch={stretch}
        />
      )}
    </Tap>
  );
}

function ButtonFace({
  state,
  label,
  icon,
  iconLeft,
  size,
  variant,
  disabled,
  loading,
  bg,
  fg,
  hoverBg,
  hoverFg,
  border,
  labelStyle,
  stretch,
}: {
  state: TapState;
  label: string;
  icon: IconName | null;
  iconLeft?: IconName;
  size: Size;
  variant: Variant;
  disabled?: boolean;
  loading?: boolean;
  bg: string;
  fg: string;
  hoverBg: string;
  hoverFg: string;
  border: string;
  labelStyle: object;
  stretch?: boolean;
}) {
  const hover = useSharedValue(0);
  const press = useSharedValue(0);
  const active = (state.hovered || state.focused) && !disabled;

  useEffect(() => {
    hover.value = withTiming(active ? 1 : 0, { duration: dur.base, easing: ease.out });
  }, [active, hover]);
  useEffect(() => {
    press.value = withTiming(state.pressed ? 1 : 0, { duration: dur.micro });
  }, [state.pressed, press]);

  const shell = useAnimatedStyle(() => ({ transform: [{ scale: 1 - press.value * 0.03 }] }));
  const wipe = useAnimatedStyle(() => ({ transform: [{ scaleX: hover.value }] }));
  const text = useAnimatedStyle(() => ({ color: interpolateColor(hover.value, [0, 1], [fg, hoverFg]) }));
  const arrow = useAnimatedStyle(() => ({ transform: [{ translateX: hover.value * 5 }] }));
  const underline = useAnimatedStyle(() => ({ transform: [{ scaleX: hover.value }] }));

  const height = HEIGHT[size];
  const fontSize = size === 's' ? 14 : size === 'm' ? 16 : 18;
  return (
    <Animated.View
      style={[
        styles.face,
        {
          height,
          paddingHorizontal: variant === 'ghost' ? 0 : PAD[size],
          backgroundColor: bg,
          borderColor: border,
          borderWidth: variant === 'ink' ? 1.5 : 0,
          opacity: disabled ? 0.45 : 1,
          justifyContent: stretch ? 'center' : 'flex-start',
        },
        shell,
      ]}
    >
      {variant !== 'ghost' ? (
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: hoverBg, transformOrigin: 'left' }, wipe]} />
      ) : (
        <Animated.View
          pointerEvents="none"
          style={[styles.underline, { backgroundColor: hoverFg, transformOrigin: 'left' }, underline]}
        />
      )}
      {iconLeft ? (
        <AnimatedIcon name={iconLeft} hover={hover} fg={fg} hoverFg={hoverFg} size={size === 's' ? 16 : 20} />
      ) : null}
      <Animated.Text numberOfLines={1} style={[labelStyle, { fontSize, lineHeight: fontSize * 1.2 }, text]}>
        {label}
      </Animated.Text>
      {loading ? (
        <ActivityIndicator size="small" color={fg} />
      ) : icon ? (
        <Animated.View style={arrow}>
          <AnimatedIcon name={icon} hover={hover} fg={fg} hoverFg={hoverFg} size={size === 's' ? 16 : 20} />
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

/** Icons can't animate their stroke colour cheaply, so cross-fade two copies. */
function AnimatedIcon({
  name,
  hover,
  fg,
  hoverFg,
  size,
}: {
  name: IconName;
  hover: { value: number };
  fg: string;
  hoverFg: string;
  size: number;
}) {
  const top = useAnimatedStyle(() => ({ opacity: hover.value }));
  return (
    <View style={{ width: size, height: size }}>
      <Icon name={name} color={fg} size={size} strokeWidth={2} />
      <Animated.View style={[StyleSheet.absoluteFill, top]}>
        <Icon name={name} color={hoverFg} size={size} strokeWidth={2} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  face: {
    borderRadius: 999,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  underline: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 8,
    height: 1.5,
  },
});
