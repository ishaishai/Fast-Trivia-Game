import type { Href } from 'expo-router';
import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { CardScope, useLight } from '@/theme/LightProvider';
import { cardShadow, flatShadow, radius as radii } from '@/theme/shape';
import { useSquish } from '../motion/Playful';
import { Tap } from './Tap';

type Tone = 'white' | 'well' | 'sun';

export interface CardProps {
  children: ReactNode;
  tone?: Tone;
  pad?: number;
  radius?: number;
  /** soft drop shadow (default) or just the hard edge, for long lists */
  shadow?: 'soft' | 'flat' | 'none';
  onPress?: () => void;
  href?: Href;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  /** where the card sits: margins, flex, width */
  style?: StyleProp<ViewStyle>;
  /** how its contents lay out: gap, direction, alignment */
  contentStyle?: StyleProp<ViewStyle>;
}

/**
 * A white rounded card with a tinted edge underneath. Everything inside reads
 * card colours (CardScope). With `onPress` or `href` the whole card is one
 * button that squishes when pressed.
 */
export function Card({
  children,
  tone = 'white',
  pad = 20,
  radius = radii.l,
  shadow = 'soft',
  onPress,
  href,
  accessibilityLabel,
  accessibilityHint,
  style,
  contentStyle,
}: CardProps) {
  const light = useLight();
  const bg = tone === 'sun' ? light.sun : tone === 'well' ? light.card.deep : light.card.field;
  const boxShadow = shadow === 'none' || tone === 'well' ? undefined : shadow === 'flat' ? flatShadow(light) : cardShadow(light);
  const face: StyleProp<ViewStyle> = [{ backgroundColor: bg, borderRadius: radius, padding: pad, boxShadow }, contentStyle];
  const body = tone === 'sun' ? children : <CardScope>{children}</CardScope>;
  if (!onPress && !href) return <View style={[face, style]}>{body}</View>;
  return (
    <Tap
      onPress={onPress}
      href={href}
      accessibilityRole={href ? 'link' : 'button'}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      style={[{ borderRadius: radius }, style]}
    >
      {({ pressed }) => (
        <PressFace pressed={pressed} style={[face, { flexGrow: 1 }]}>
          {body}
        </PressFace>
      )}
    </Tap>
  );
}

function PressFace({ pressed, style, children }: { pressed: boolean; style: StyleProp<ViewStyle>; children: ReactNode }) {
  const squish = useSquish(pressed, 0.97);
  return <Animated.View style={[style, squish]}>{children}</Animated.View>;
}
