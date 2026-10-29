import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useLight } from '@/theme/LightProvider';
import { springs } from '@/theme/motion';
import { Tap } from './Tap';
import { T } from './Text';

/** A labelled switch row. The knob is a little sun. */
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
  const on = useSharedValue(value ? 1 : 0);
  useEffect(() => {
    on.value = withSpring(value ? 1 : 0, springs.snappy);
  }, [on, value]);
  const track = useAnimatedStyle(() => ({ backgroundColor: interpolateColor(on.value, [0, 1], [light.deep, light.sun]) }));
  const knob = useAnimatedStyle(() => ({
    transform: [{ translateX: on.value * 22 }],
    backgroundColor: interpolateColor(on.value, [0, 1], [light.muted, light.onSun]),
  }));
  return (
    <Tap
      onPress={() => onChange(!value)}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled: Boolean(disabled) }}
      accessibilityLabel={label}
      accessibilityHint={hint}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 14, opacity: disabled ? 0.5 : 1 }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <T v="title">{label}</T>
        {hint ? (
          <T v="bodyS" muted>
            {hint}
          </T>
        ) : null}
      </View>
      <Animated.View style={[{ width: 52, height: 30, borderRadius: 999, padding: 4 }, track]}>
        <Animated.View style={[{ width: 22, height: 22, borderRadius: 11 }, knob]} />
      </Animated.View>
    </Tap>
  );
}

/** Segmented choice: a row of pills, the active one lit. */
export function Segmented<V extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: V; label: string }[];
  value: V;
  onChange: (value: V) => void;
  label: string;
}) {
  const light = useLight();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Tap
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="radio"
            accessibilityState={{ checked: active }}
            accessibilityLabel={o.label}
            style={({ hovered }) => ({
              height: 38,
              paddingHorizontal: 16,
              borderRadius: 999,
              justifyContent: 'center',
              backgroundColor: active ? light.sun : hovered ? light.raised : 'transparent',
              borderWidth: 1.5,
              borderColor: active ? light.sun : light.line,
            })}
          >
            <T v="label" color={active ? light.onSun : light.ink}>
              {o.label}
            </T>
          </Tap>
        );
      })}
    </View>
  );
}
