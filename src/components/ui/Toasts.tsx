import { useEffect } from 'react';
import { AccessibilityInfo, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';
import { useLight } from '@/theme/LightProvider';
import { dur, ease } from '@/theme/motion';
import { T } from './Text';

interface Toast {
  id: number;
  text: string;
  tone: 'info' | 'error';
}

interface ToastState {
  toasts: Toast[];
  push: (text: string, tone?: Toast['tone']) => void;
  dismiss: (id: number) => void;
}

let seq = 0;

export const useToasts = create<ToastState>()((set, get) => ({
  toasts: [],
  push: (text, tone = 'info') => {
    const id = ++seq;
    set({ toasts: [...get().toasts.slice(-2), { id, text, tone }] });
    AccessibilityInfo.announceForAccessibility(text);
    setTimeout(() => get().dismiss(id), tone === 'error' ? 5200 : 3600);
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));

export const toast = (text: string, tone?: Toast['tone']) => useToasts.getState().push(text, tone);

/** Short confirmations and errors, top of the screen, in the interface's voice. */
export function Toasts() {
  const toasts = useToasts((s) => s.toasts);
  const insets = useSafeAreaInsets();
  return (
    <View
      pointerEvents="box-none"
      aria-live="polite"
      style={{ position: 'absolute', top: insets.top + 12, left: 0, right: 0, alignItems: 'center', gap: 8, zIndex: 100 }}
    >
      {toasts.map((t) => (
        <ToastPill key={t.id} toast={t} />
      ))}
    </View>
  );
}

function ToastPill({ toast: t }: { toast: Toast }) {
  const light = useLight();
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withTiming(1, { duration: dur.base, easing: ease.out });
  }, [p]);
  const style = useAnimatedStyle(() => ({ opacity: p.value, transform: [{ translateY: (1 - p.value) * -14 }] }));
  const error = t.tone === 'error';
  return (
    <Animated.View
      style={[
        {
          maxWidth: 520,
          marginHorizontal: 16,
          paddingHorizontal: 18,
          paddingVertical: 12,
          borderRadius: 999,
          backgroundColor: error ? '#FF4D4D' : light.ink,
        },
        style,
      ]}
    >
      <T v="bodyS" color={error ? '#2A0606' : light.field} style={{ fontFamily: 'AtkinsonHyperlegibleNext_600SemiBold' }}>
        {t.text}
      </T>
    </Animated.View>
  );
}
