import { View } from 'react-native';
import { useLight } from '@/theme/LightProvider';
import { SUNNY } from '@/theme/palette';
import { FONTS } from '@/theme/typography';
import { T } from '../ui/Text';
import { Mark } from './Mark';

interface LogoProps {
  size?: number;
  color?: string;
  sun?: string;
}

/** Sunny + the wordmark, round and bold. */
export function Logo({ size = 18, color, sun }: LogoProps) {
  const light = useLight();
  const ink = color ?? light.ink;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: size * 0.4 }} accessible accessibilityLabel="Meridian">
      <Mark size={size * 1.9} sun={sun ?? light.sun} line={SUNNY.face} />
      <T
        v="label"
        color={ink}
        style={{ fontFamily: FONTS.display, fontSize: size * 1.25, lineHeight: size * 1.5, letterSpacing: 0.2 }}
        accessibilityElementsHidden
        importantForAccessibility="no"
      >
        Meridian
      </T>
    </View>
  );
}
