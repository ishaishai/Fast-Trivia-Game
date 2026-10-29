import { useEffect, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { onCard, useLight } from '@/theme/LightProvider';
import { springs } from '@/theme/motion';
import { Icon } from '../icons';
import { PopIn } from '../motion/Playful';
import { Tap } from './Tap';
import { T } from './Text';

/** A row that opens to show more. Details stay out of the way until someone asks for them. */
export function Disclosure({ title, children, initiallyOpen = false }: { title: string; children: ReactNode; initiallyOpen?: boolean }) {
  const light = useLight();
  const [open, setOpen] = useState(initiallyOpen);
  const turn = useSharedValue(initiallyOpen ? 1 : 0);
  useEffect(() => {
    turn.set(withSpring(open ? 1 : 0, springs.pop));
  }, [open, turn]);
  const chevron = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.value * 180}deg` }] }));
  const bg = onCard(light) ? light.deep : '#FFFFFF';
  return (
    <View style={{ gap: 12 }}>
      <Tap
        onPress={() => setOpen((o) => !o)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={title}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingHorizontal: 18,
          height: 56,
          borderRadius: 18,
          backgroundColor: bg,
          boxShadow: onCard(light) ? undefined : `0px 4px 0px 0px ${light.shadow}`,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        })}
      >
        <T v="title" color={light.card.ink} style={{ flex: 1 }}>
          {title}
        </T>
        <Animated.View style={chevron}>
          <Icon name="chevron-down" color={light.card.ink} size={22} strokeWidth={2.8} />
        </Animated.View>
      </Tap>
      {open ? <PopIn from={0.96}>{children}</PopIn> : null}
    </View>
  );
}
