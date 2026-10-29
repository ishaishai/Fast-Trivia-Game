import { useState } from 'react';
import { View } from 'react-native';
import { copy } from '@/copy/en';
import { useLight } from '@/theme/LightProvider';
import { CANDY, CARD } from '@/theme/palette';
import { Icon, type IconName } from '../icons';
import { PopIn } from '../motion/Playful';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Sheet } from '../ui/Sheet';
import { T } from '../ui/Text';
import { TryOne } from './TryOne';

/** The whole game in three lines, and a question to try. */
export function HowToCard() {
  const [trying, setTrying] = useState(false);
  return (
    <Card contentStyle={{ gap: 16 }}>
      <T v="m" accessibilityRole="header">
        {copy.play.howTo}
      </T>
      <View style={{ gap: 12 }}>
        {copy.play.steps.map((step, i) => (
          <PopIn key={step.text} index={i}>
            <Step icon={step.icon as IconName} text={step.text} index={i} />
          </PopIn>
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 16 }}>
        <Button label={copy.play.tryOne} size="m" variant="ink" iconLeft="play" onPress={() => setTrying(true)} />
        <Button label={copy.play.allRules} size="m" variant="ghost" href="/rules" icon="chevron-right" />
      </View>
      <Sheet visible={trying} onClose={() => setTrying(false)} title="Feel three seconds">
        <TryOne />
      </Sheet>
    </Card>
  );
}

const STEP_COLORS = [CANDY.sky.bg, CANDY.sun.bg, CANDY.pink.bg];

function Step({ icon, text, index }: { icon: IconName; text: string; index: number }) {
  const light = useLight();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 14,
          backgroundColor: STEP_COLORS[index % STEP_COLORS.length],
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: `0px 3px 0px 0px ${light.shadow}`,
        }}
      >
        <Icon name={icon} color={CARD.ink} size={22} strokeWidth={2.6} filled={icon !== 'clock'} />
      </View>
      <T v="title" style={{ flex: 1 }}>
        {text}
      </T>
    </View>
  );
}
