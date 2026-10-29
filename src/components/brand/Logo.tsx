import { View } from 'react-native';
import { useLight } from '@/theme/LightProvider';
import { FONTS } from '@/theme/typography';
import { T } from '../ui/Text';
import { Mark } from './Mark';

interface LogoProps {
  size?: number;
  color?: string;
  sun?: string;
}

/** Mark + wordmark. The wordmark is set wide in Big Shoulders Black. */
export function Logo({ size = 18, color, sun }: LogoProps) {
  const light = useLight();
  const ink = color ?? light.ink;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: size * 0.45 }} accessible accessibilityLabel="Meridian">
      <Mark size={size * 1.55} sun={sun ?? light.sun} line={ink} />
      <T
        v="label"
        color={ink}
        style={{ fontFamily: FONTS.black, fontSize: size, lineHeight: size * 1.1, letterSpacing: size * 0.32 }}
        accessibilityElementsHidden
        importantForAccessibility="no"
      >
        MERIDIAN
      </T>
    </View>
  );
}
