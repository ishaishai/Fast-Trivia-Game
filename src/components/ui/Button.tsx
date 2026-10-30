import type { Href } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View, type GestureResponderEvent, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { onCard, useLight } from '@/theme/LightProvider';
import { springs, useMotionOK } from '@/theme/motion';
import { LIPS, WHITE } from '@/theme/palette';
import { lip as LIP } from '@/theme/shape';
import { Icon, type IconName } from '../icons';
import { Float, Pulse } from '../motion/Playful';
import { Tap, type TapState } from './Tap';
import { T } from './Text';

type Variant = 'sun' | 'ink' | 'ghost';
type Size = 'xl' | 'l' | 'm' | 's';

export interface ButtonProps {
  label: string;
  onPress?: (event: GestureResponderEvent) => void;
  href?: Href;
  /** sun: the main thing to do. ink: a white (or, on a card, lavender) secondary. ghost: a text link. */
  variant?: Variant;
  size?: Size;
  icon?: IconName | null;
  iconLeft?: IconName;
  disabled?: boolean;
  /** not pressable right now, but not greyed out either (an answer being revealed) */
  inert?: boolean;
  loading?: boolean;
  /** Override colours when a button sits outside the page light (the run, the answer tiles). */
  colors?: { bg: string; fg: string; lip?: string; hoverBg?: string; hoverFg?: string };
  /** an idle loop that invites a press */
  idle?: 'pulse' | 'bob';
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  stretch?: boolean;
}

const HEIGHT: Record<Size, number> = { xl: 72, l: 60, m: 50, s: 40 };
const PAD: Record<Size, number> = { xl: 36, l: 28, m: 22, s: 16 };
const FONT: Record<Size, number> = { xl: 26, l: 21, m: 18, s: 15 };
const ICON: Record<Size, number> = { xl: 28, l: 22, m: 20, s: 17 };
const RADIUS: Record<Size, number> = { xl: 26, l: 22, m: 18, s: 14 };
/** Icons that read better as solid shapes. */
const SOLID = new Set<IconName>(['play', 'star', 'bolt', 'fire', 'trophy', 'sparkle']);

/**
 * Chunky game buttons: a coloured face on a darker lip. Pressing pushes the
 * face down onto the lip; letting go springs it back up, a little past where
 * it started.
 */
export function Button({
  label,
  href,
  onPress,
  variant = 'sun',
  size = 'l',
  icon = null,
  iconLeft,
  disabled,
  inert,
  loading,
  colors,
  idle,
  accessibilityLabel,
  accessibilityHint,
  style,
  stretch,
}: ButtonProps) {
  const light = useLight();
  const card = onCard(light);
  const palette =
    colors ??
    {
      sun: { bg: light.sun, fg: light.onSun, lip: light.sunLip },
      ink: card
        ? { bg: light.card.deep, fg: light.card.ink, lip: LIPS.well }
        : { bg: WHITE, fg: light.card.ink, lip: LIPS.white },
      ghost: { bg: 'transparent', fg: light.ink, lip: 'transparent' },
    }[variant];
  const tap = (
    <Tap
      href={disabled ? undefined : href}
      onPress={onPress}
      disabled={disabled || inert || loading}
      accessibilityRole={href ? 'link' : 'button'}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: Boolean(disabled || inert), busy: Boolean(loading) }}
      style={[{ alignSelf: stretch ? 'stretch' : 'flex-start', borderRadius: RADIUS[size] }, idle ? null : style]}
    >
      {(state) =>
        variant === 'ghost' ? (
          <GhostFace state={state} label={label} icon={icon} iconLeft={iconLeft} size={size} fg={palette.fg} disabled={disabled} />
        ) : (
          <ButtonFace
            state={state}
            label={label}
            icon={icon}
            iconLeft={iconLeft}
            size={size}
            disabled={disabled}
            loading={loading}
            bg={palette.bg}
            fg={palette.fg}
            lipColor={palette.lip ?? 'rgba(0, 0, 0, 0.25)'}
            stretch={stretch}
          />
        )
      }
    </Tap>
  );
  if (!idle || disabled) return tap;
  const wrap: StyleProp<ViewStyle> = [{ alignSelf: stretch ? 'stretch' : 'flex-start' }, style];
  return idle === 'pulse' ? (
    <Pulse scale={1.045} style={wrap}>
      {tap}
    </Pulse>
  ) : (
    <Float amplitude={4} style={wrap}>
      {tap}
    </Float>
  );
}

/** One line that shrinks (to 70%) rather than lose the end of a word on a narrow screen. */
function Label({ label, size, color }: { label: string; size: Size; color: string }) {
  return (
    <T v="button" size={FONT[size]} color={color} fit={0.7} style={{ flexShrink: 1 }}>
      {label}
    </T>
  );
}

function ButtonFace({
  state,
  label,
  icon,
  iconLeft,
  size,
  disabled,
  loading,
  bg,
  fg,
  lipColor,
  stretch,
}: {
  state: TapState;
  label: string;
  icon: IconName | null;
  iconLeft?: IconName;
  size: Size;
  disabled?: boolean;
  loading?: boolean;
  bg: string;
  fg: string;
  lipColor: string;
  stretch?: boolean;
}) {
  const motion = useMotionOK();
  const height = HEIGHT[size];
  const lip = LIP[size];
  const r = RADIUS[size];
  const down = useSharedValue(0);
  const pressed = state.pressed && !disabled;
  const lifted = (state.hovered || state.focused) && !disabled && !pressed;
  useEffect(() => {
    const to = pressed ? lip : lifted ? -1.5 : 0;
    if (!motion) down.set(withTiming(to, { duration: 80 }));
    else down.set(withSpring(to, pressed ? springs.press : springs.release));
  }, [down, lifted, lip, motion, pressed]);
  const face = useAnimatedStyle(() => ({ transform: [{ translateY: down.value }] }));
  return (
    <View style={{ height: height + lip, opacity: disabled ? 0.5 : 1, alignSelf: stretch ? 'stretch' : 'flex-start' }}>
      <View style={[styles.lip, { top: lip, height, borderRadius: r, backgroundColor: lipColor }]} />
      <Animated.View
        style={[
          styles.face,
          {
            height,
            borderRadius: r,
            paddingHorizontal: PAD[size],
            backgroundColor: bg,
            gap: size === 's' ? 8 : 10,
            justifyContent: 'center',
          },
          face,
        ]}
      >
        {/* A soft highlight across the top half — the face looks rounded, like a sweet. */}
        <View pointerEvents="none" style={[styles.shine, { borderTopLeftRadius: r - 3, borderTopRightRadius: r - 3, height: height * 0.42 }]} />
        {iconLeft ? <Icon name={iconLeft} color={fg} size={ICON[size]} strokeWidth={2.6} filled={SOLID.has(iconLeft)} /> : null}
        <Label label={label} size={size} color={fg} />
        {loading ? (
          <ActivityIndicator size="small" color={fg} />
        ) : icon ? (
          <Icon name={icon} color={fg} size={ICON[size]} strokeWidth={2.6} filled={SOLID.has(icon)} />
        ) : null}
      </Animated.View>
    </View>
  );
}

function GhostFace({
  state,
  label,
  icon,
  iconLeft,
  size,
  fg,
  disabled,
}: {
  state: TapState;
  label: string;
  icon: IconName | null;
  iconLeft?: IconName;
  size: Size;
  fg: string;
  disabled?: boolean;
}) {
  const motion = useMotionOK();
  const s = useSharedValue(1);
  const pressed = state.pressed && !disabled;
  useEffect(() => {
    const to = pressed ? 0.94 : 1;
    s.set(motion ? withSpring(to, pressed ? springs.press : springs.release) : withTiming(to, { duration: 80 }));
  }, [motion, pressed, s]);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  const hover = (state.hovered || state.focused) && !disabled;
  return (
    <Animated.View style={[{ height: HEIGHT[size], flexDirection: 'row', alignItems: 'center', gap: 8, opacity: disabled ? 0.5 : 1 }, animated]}>
      {iconLeft ? <Icon name={iconLeft} color={fg} size={ICON[size] - 2} strokeWidth={2.6} /> : null}
      <View>
        <Label label={label} size={size === 'xl' ? 'l' : size === 'l' ? 'm' : size} color={fg} />
        <View style={[styles.underline, { backgroundColor: fg, opacity: hover ? 1 : 0 }]} />
      </View>
      {icon ? <Icon name={icon} color={fg} size={ICON[size] - 2} strokeWidth={2.6} /> : null}
    </Animated.View>
  );
}

/** Round icon-only button with the same lip, for toolbars (sound, close). */
export function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  size = 44,
  colors,
}: {
  icon: IconName;
  onPress: () => void;
  accessibilityLabel: string;
  size?: number;
  colors?: { bg: string; fg: string; lip: string };
}) {
  const light = useLight();
  const c = colors ?? { bg: WHITE, fg: light.card.ink, lip: LIPS.white };
  return (
    <Tap onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel} style={{ borderRadius: size }}>
      {(state) => <RoundFace state={state} icon={icon} size={size} {...c} />}
    </Tap>
  );
}

function RoundFace({ state, icon, size, bg, fg, lip: lipColor }: { state: TapState; icon: IconName; size: number; bg: string; fg: string; lip: string }) {
  const motion = useMotionOK();
  const down = useSharedValue(0);
  const lip = 4;
  useEffect(() => {
    const to = state.pressed ? lip : 0;
    down.set(motion ? withSpring(to, state.pressed ? springs.press : springs.release) : withTiming(to, { duration: 80 }));
  }, [down, motion, state.pressed]);
  const face = useAnimatedStyle(() => ({ transform: [{ translateY: down.value }] }));
  return (
    <View style={{ width: size, height: size + lip }}>
      <View style={[styles.lip, { top: lip, height: size, borderRadius: size, backgroundColor: lipColor }]} />
      <Animated.View style={[{ width: size, height: size, borderRadius: size, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }, face]}>
        <Icon name={icon} color={fg} size={size * 0.5} strokeWidth={2.6} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  lip: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  face: {
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  shine: {
    position: 'absolute',
    top: 3,
    left: 3,
    right: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  underline: {
    height: 2.5,
    borderRadius: 2,
    marginTop: -2,
  },
});
