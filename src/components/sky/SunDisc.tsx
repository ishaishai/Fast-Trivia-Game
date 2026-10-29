import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

/**
 * The sun. Optionally eclipsed: a moon the colour of the sky slides across it.
 * `eclipse` runs 0 (clear) → 1 (total). This is Meridian's timer.
 */
export function SunDisc({
  size,
  color,
  sky,
  eclipse,
  glow,
  moonStyle,
  style,
  children,
}: {
  size: number;
  color: string;
  sky: string;
  eclipse?: SharedValue<number>;
  glow?: string;
  /** For skies whose colour is itself animated (the run). */
  moonStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}) {
  const moon = useAnimatedStyle(() => {
    const e = eclipse ? eclipse.value : 0;
    return { transform: [{ translateX: (e - 1) * size * 1.06 }] };
  });
  const corona = useAnimatedStyle(() => {
    const e = eclipse ? eclipse.value : 0;
    const t = Math.min(1, Math.max(0, (e - 0.82) / 0.18));
    return { opacity: t, transform: [{ scale: 1 + t * 0.04 }] };
  });
  const halo = size * 1.9;
  return (
    <View style={[{ width: size, height: size }, style]} aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {glow ? (
        <View pointerEvents="none" style={{ position: 'absolute', left: (size - halo) / 2, top: (size - halo) / 2 }}>
          <Svg width={halo} height={halo}>
            <Defs>
              <RadialGradient id="sunglow" cx="50%" cy="50%" r="50%">
                <Stop offset="0.45" stopColor={glow} stopOpacity={1} />
                <Stop offset="1" stopColor={glow} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Circle cx={halo / 2} cy={halo / 2} r={halo / 2} fill="url(#sunglow)" />
          </Svg>
        </View>
      ) : null}
      {eclipse ? (
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              left: -5,
              top: -5,
              width: size + 10,
              height: size + 10,
              borderRadius: (size + 10) / 2,
              borderWidth: 2,
              borderColor: color,
            },
            corona,
          ]}
        />
      ) : null}
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, overflow: 'hidden' }}>
        {eclipse ? (
          <Animated.View
            style={[StyleSheet.absoluteFill, { borderRadius: size / 2, backgroundColor: sky }, moonStyle, moon]}
          />
        ) : null}
      </View>
      {children}
    </View>
  );
}
