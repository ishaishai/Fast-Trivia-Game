import { View } from 'react-native';
import { Mark } from '@/components/brand/Mark';
import { Grain } from '@/components/ui/bits';
import { Button } from '@/components/ui/Button';
import { T } from '@/components/ui/Text';
import { copy } from '@/copy/en';
import { useLight } from '@/theme/LightProvider';

export default function NotFound() {
  const light = useLight();
  return (
    <View role="main" style={{ flex: 1, backgroundColor: light.field, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 20 }}>
      <Grain />
      <Mark size={88} sun={light.sun} line={light.ink} />
      <T v="xl" align="center" accessibilityRole="header">
        {copy.notFound.title}
      </T>
      <T v="bodyL" muted align="center">
        {copy.notFound.body}
      </T>
      <Button label={copy.notFound.cta} href="/" />
    </View>
  );
}
