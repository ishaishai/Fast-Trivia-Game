import { View } from 'react-native';
import { Sunny } from '@/components/brand/Sunny';
import { Float } from '@/components/motion/Playful';
import { WorldBackdrop } from '@/components/sky/World';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { T } from '@/components/ui/Text';
import { copy } from '@/copy/en';

export default function NotFound() {
  return (
    <View role="main" style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <WorldBackdrop />
      <View style={{ width: '100%', maxWidth: 440, gap: 16, alignItems: 'center' }}>
        <Float amplitude={8}>
          <Sunny size={150} mood="worried" />
        </Float>
        <Card style={{ alignSelf: 'stretch' }} contentStyle={{ gap: 12, alignItems: 'center' }}>
          <T v="l" align="center" accessibilityRole="header">
            {copy.notFound.title}
          </T>
          <T v="bodyL" muted align="center">
            {copy.notFound.body}
          </T>
          <Button label={copy.notFound.cta} href="/" iconLeft="play" />
        </Card>
      </View>
    </View>
  );
}
