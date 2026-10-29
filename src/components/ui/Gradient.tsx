import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';

/** CSS linear-gradient for a background, top to bottom by default. */
export function gradient(colors: readonly string[], angle = 180): string {
  return `linear-gradient(${angle}deg, ${colors.join(', ')})`;
}

/**
 * A view painted with a linear gradient. React Native 0.88 draws
 * `backgroundImage` natively and the web passes it to CSS, so this is the one
 * place to swap in another renderer if a platform ever needs one.
 */
export function Gradient({
  colors,
  angle = 180,
  style,
  children,
  ...rest
}: ViewProps & { colors: readonly string[]; angle?: number; style?: StyleProp<ViewStyle>; children?: ReactNode }) {
  return (
    <View {...rest} style={[{ backgroundColor: colors[0], backgroundImage: gradient(colors, angle) }, style]}>
      {children}
    </View>
  );
}
