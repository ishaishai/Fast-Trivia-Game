import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { SIGNAL } from '@/theme/palette';

/**
 * The question timer as a row of pixels that empty from the right as the
 * eclipse closes in, turning orange for the last third. It is information,
 * not decoration, so it keeps moving under reduced motion.
 */
export function PixelTimer({
  eclipse,
  cells = 10,
  color,
  track,
  height = 16,
  style,
}: {
  /** 0 = a fresh question, 1 = time's up */
  eclipse: SharedValue<number>;
  cells?: number;
  color: string;
  track: string;
  height?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[{ flexDirection: 'row', gap: 4, height }, style]} aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {Array.from({ length: cells }, (_, i) => (
        <Cell key={i} index={i} cells={cells} eclipse={eclipse} color={color} track={track} />
      ))}
    </View>
  );
}

function Cell({ index, cells, eclipse, color, track }: { index: number; cells: number; eclipse: SharedValue<number>; color: string; track: string }) {
  const fill = useAnimatedStyle(() => {
    const left = (1 - eclipse.value) * cells - index;
    const k = Math.min(1, Math.max(0, left));
    return {
      opacity: k,
      transform: [{ scale: 0.55 + 0.45 * k }],
      backgroundColor: interpolateColor(eclipse.value, [0, 0.62, 0.72], [color, color, SIGNAL.warn]),
    };
  });
  return (
    <View style={{ flex: 1, borderRadius: 5, backgroundColor: track }}>
      <Animated.View style={[{ flex: 1, borderRadius: 5 }, fill]} />
    </View>
  );
}
