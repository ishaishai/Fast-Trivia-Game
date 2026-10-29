import { useEffect, useState } from 'react';
import { ScrollView, View, type LayoutRectangle } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { onCard, useLight } from '@/theme/LightProvider';
import { springs, useMotionOK } from '@/theme/motion';
import { SIGNAL } from '@/theme/palette';
import { Tap } from './Tap';
import { T } from './Text';

/** A labelled switch row. The knob springs across and squashes as it lands. */
export function Toggle({
  label,
  hint,
  value,
  onChange,
  disabled,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  const light = useLight();
  const motion = useMotionOK();
  const on = useSharedValue(value ? 1 : 0);
  useEffect(() => {
    on.set(motion ? withSpring(value ? 1 : 0, springs.pop) : withTiming(value ? 1 : 0, { duration: 120 }));
  }, [motion, on, value]);
  const off = onCard(light) ? '#CFC6EC' : light.deep;
  const track = useAnimatedStyle(() => ({ backgroundColor: interpolateColor(Math.min(1, Math.max(0, on.value)), [0, 1], [off, SIGNAL.correct]) }));
  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: on.value * 24 }] }));
  return (
    <Tap
      onPress={() => onChange(!value)}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled: Boolean(disabled) }}
      accessibilityLabel={label}
      accessibilityHint={hint}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 12, opacity: disabled ? 0.5 : 1 }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <T v="title">{label}</T>
        {hint ? (
          <T v="bodyS" muted>
            {hint}
          </T>
        ) : null}
      </View>
      <Animated.View style={[{ width: 58, height: 34, borderRadius: 999, padding: 4 }, track]}>
        <Animated.View style={[{ width: 26, height: 26, borderRadius: 13, backgroundColor: '#FFFFFF', boxShadow: '0px 2px 0px 0px rgba(0, 0, 0, 0.18)' }, knob]} />
      </Animated.View>
    </Tap>
  );
}

/**
 * Segmented choice: a rounded track with a white pill that slides to the
 * chosen option. `scroll` lets a long list of options swipe sideways.
 */
export function Segmented<V extends string>({
  options,
  value,
  onChange,
  label,
  scroll,
  stretch,
}: {
  options: { value: V; label: string }[];
  value: V;
  onChange: (value: V) => void;
  label: string;
  scroll?: boolean;
  /** options share the full width equally */
  stretch?: boolean;
}) {
  const light = useLight();
  const motion = useMotionOK();
  const card = onCard(light);
  const [boxes, setBoxes] = useState<Record<string, LayoutRectangle>>({});
  const x = useSharedValue(0);
  const w = useSharedValue(0);
  const active = boxes[value];
  useEffect(() => {
    if (!active) return;
    if (!motion || !w.get()) {
      x.set(active.x);
      w.set(active.width);
      return;
    }
    x.set(withSpring(active.x, springs.pop));
    w.set(withSpring(active.width, springs.pop));
  }, [active, motion, w, x]);
  const pill = useAnimatedStyle(() => ({ width: w.value, transform: [{ translateX: x.value }] }));
  // A darker track under white ink, a lighter one under dark ink.
  const track = card ? light.deep : light.statusBar === 'light' ? 'rgba(20, 10, 60, 0.3)' : 'rgba(255, 255, 255, 0.5)';

  const row = (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ flexDirection: 'row', padding: 4, borderRadius: 999, backgroundColor: track, alignSelf: stretch ? 'stretch' : 'flex-start' }}>
      {active ? (
        <Animated.View
          pointerEvents="none"
          style={[{ position: 'absolute', top: 4, bottom: 4, left: 0, borderRadius: 999, backgroundColor: '#FFFFFF', boxShadow: `0px 3px 0px 0px ${light.shadow}` }, pill]}
        />
      ) : null}
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Tap
            key={o.value}
            onPress={() => onChange(o.value)}
            onLayout={(e) => {
              const box = e.nativeEvent.layout;
              setBoxes((prev) => (prev[o.value]?.x === box.x && prev[o.value]?.width === box.width ? prev : { ...prev, [o.value]: box }));
            }}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            accessibilityLabel={o.label}
            style={{ height: 40, paddingHorizontal: 16, borderRadius: 999, justifyContent: 'center', alignItems: 'center', flex: stretch ? 1 : undefined }}
          >
            <T v="label" color={on ? light.card.ink : card ? light.muted : light.ink} style={{ fontSize: 15 }}>
              {o.label}
            </T>
          </Tap>
        );
      })}
    </View>
  );
  if (!scroll) return row;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ paddingRight: 8 }}>
      {row}
    </ScrollView>
  );
}
