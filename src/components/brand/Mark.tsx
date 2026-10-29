import { View } from 'react-native';
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';
import { WHITE } from '@/theme/palette';

interface MarkProps {
  size?: number;
  sun: string;
  /** colour of the face */
  line: string;
}

/** The Meridian mark: Sunny, still. Used where nothing should move (boot, icons, errors). */
export function Mark({ size = 28, sun, line }: MarkProps) {
  return (
    <View pointerEvents="none" aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={size} height={size} viewBox="0 0 100 100">
        {Array.from({ length: 8 }, (_, i) => (
          <Rect key={i} x="45" y="2" width="10" height="16" rx="5" fill={sun} transform={`rotate(${i * 45} 50 50)`} />
        ))}
        <Circle cx="50" cy="50" r="31" fill={sun} />
        <Circle cx="39" cy="38" r="8" fill={WHITE} opacity={0.35} />
        <Ellipse cx="40" cy="48" rx="4" ry="5" fill={line} />
        <Ellipse cx="60" cy="48" rx="4" ry="5" fill={line} />
        <Path d="M38 60 Q50 74 62 60 Z" fill={line} />
      </Svg>
    </View>
  );
}
