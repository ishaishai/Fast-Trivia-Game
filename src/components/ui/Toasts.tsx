import { useEffect } from 'react';
import { AccessibilityInfo, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';
import { useLight } from '@/theme/LightProvider';
import { dur, ease, springs, useMotionOK } from '@/theme/motion';
import { CARD, SIGNAL, WHITE } from '@/theme/palette';
import { FONTS } from '@/theme/typography';
import { Icon } from '../icons';
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
  const motion = useMotionOK();
  const p = useSharedValue(0);
  useEffect(() => {
    p.set(motion ? withSpring(1, springs.pop) : withTiming(1, { duration: dur.short, easing: ease.out }));
  }, [motion, p]);
  const style = useAnimatedStyle(() => ({ opacity: Math.min(1, p.value * 1.5), transform: [{ translateY: (1 - p.value) * -24 }, { scale: 0.8 + 0.2 * p.value }] }));
  const error = t.tone === 'error';
  return (
    <Animated.View
      style={[
        {
          maxWidth: 520,
          marginHorizontal: 16,
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderRadius: 22,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          backgroundColor: error ? SIGNAL.wrong : WHITE,
          boxShadow: `0px 4px 0px 0px ${error ? SIGNAL.wrongLip : light.shadow}`,
        },
        style,
      ]}
    >
      <Icon name={error ? 'cross' : 'check'} color={error ? SIGNAL.onWrong : SIGNAL.correctLip} size={18} strokeWidth={3} />
      <T v="bodyS" color={error ? SIGNAL.onWrong : CARD.ink} style={{ fontFamily: FONTS.displaySemi, fontSize: 15, flexShrink: 1 }}>
        {t.text}
      </T>
    </Animated.View>
  );
}
