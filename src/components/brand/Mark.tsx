import { View } from 'react-native';
import Svg, { Circle, Rect } from 'react-native-svg';

interface MarkProps {
  size?: number;
  sun: string;
  line: string;
}

/** The Meridian mark: the sun, crossed by the line it climbs to every day. */
export function Mark({ size = 28, sun, line }: MarkProps) {
  return (
    <View pointerEvents="none" aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Circle cx="50" cy="50" r="29" fill={sun} />
        <Rect x="48.6" y="12" width="2.8" height="76" rx="1.4" fill={line} />
      </Svg>
    </View>
  );
}
