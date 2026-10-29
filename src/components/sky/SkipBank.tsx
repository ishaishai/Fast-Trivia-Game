import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming } from 'react-native-reanimated';
import { RULES } from '@shared/rules';
import { useLight } from '@/theme/LightProvider';
import { useMotionOK } from '@/theme/motion';
import { T } from '../ui/Text';

/**
 * Twenty-four skips a day — one for every hour. Drawn as the hour marks of a
 * day; a spent skip drops out of its slot.
 */
export function SkipBank({
  left,
  total = RULES.SKIPS_PER_DAY,
  size = 'm',
  color,
  dimColor,
  label = true,
  textColor,
}: {
  left: number;
  total?: number;
  size?: 's' | 'm';
  color?: string;
  dimColor?: string;
  label?: boolean;
  textColor?: string;
}) {
  const light = useLight();
  const tick = size === 'm' ? { w: 3, h: 18, gap: 4 } : { w: 2, h: 11, gap: 3 };
  return (
    <View
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
      accessible
      accessibilityLabel={`${left} of ${total} skips left today`}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: tick.gap, height: tick.h + 6 }}>
        {Array.from({ length: total }, (_, i) => (
          <Tick key={i} index={i} on={i < left} w={tick.w} h={tick.h} color={color ?? light.sun} dim={dimColor ?? light.line} major={i % 6 === 0} />
        ))}
      </View>
      {label ? (
        <T v="label" color={textColor ?? light.ink}>
          {left} left
        </T>
      ) : null}
    </View>
  );
}

function Tick({ index, on, w, h, color, dim, major }: { index: number; on: boolean; w: number; h: number; color: string; dim: string; major: boolean }) {
  const motion = useMotionOK();
  const p = useSharedValue(on ? 1 : 0);
  useEffect(() => {
    if (!motion) {
      p.value = on ? 1 : 0;
      return;
    }
    p.value = on ? withDelay(index * 12, withSpring(1, { damping: 16, stiffness: 180 })) : withTiming(0, { duration: 420 });
  }, [index, motion, on, p]);
  const lit = useAnimatedStyle(() => ({
    opacity: p.value,
    transform: [{ translateY: (1 - p.value) * h * 0.8 }],
  }));
  const height = major ? h : h * 0.72;
  return (
    <View style={{ width: w, height, borderRadius: w, backgroundColor: dim, overflow: 'hidden' }}>
      <Animated.View style={[{ flex: 1, borderRadius: w, backgroundColor: color }, lit]} />
    </View>
  );
}
