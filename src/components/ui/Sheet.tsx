import { useEffect, useState, type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';
import { useLayout } from '@/theme/layout';
import { CardScope, useLight } from '@/theme/LightProvider';
import { dur, ease, springs, useMotionOK } from '@/theme/motion';
import { LIPS } from '@/theme/palette';
import { IconButton } from './Button';
import { T } from './Text';

/**
 * A dialog: a bottom sheet on phones, a centred panel on wider screens.
 * Escape and the backdrop close it; focus is trapped while it's open.
 */
export function Sheet({
  visible,
  onClose,
  title,
  children,
  colors,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  colors?: { bg: string; ink: string; muted: string; line: string };
}) {
  const light = useLight();
  const motion = useMotionOK();
  const { isPhone, width } = useLayout();
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const p = useSharedValue(0);
  const c = colors ?? { bg: light.card.field, ink: light.card.ink, muted: light.card.muted, line: light.card.line };
  // Opening mounts immediately; closing unmounts after the exit animation.
  if (visible && !mounted) setMounted(true);

  useEffect(() => {
    if (visible) {
      p.set(motion ? withSpring(1, springs.pop) : withTiming(1, { duration: dur.short, easing: ease.out }));
    } else {
      p.set(
        withTiming(0, { duration: dur.short, easing: ease.in }, (done) => {
          if (done) scheduleOnRN(setMounted, false);
        }),
      );
    }
  }, [motion, p, visible]);

  const backdrop = useAnimatedStyle(() => ({ opacity: Math.min(1, p.value) }));
  const panel = useAnimatedStyle(() => ({
    opacity: isPhone ? 1 : Math.min(1, p.value * 1.5),
    transform: isPhone ? [{ translateY: Math.max(0, (1 - p.value) * 520) }] : [{ translateY: (1 - p.value) * 40 }, { scale: 0.9 + 0.1 * p.value }],
  }));

  if (!mounted) return null;
  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={[StyleSheet.absoluteFill, { justifyContent: isPhone ? 'flex-end' : 'center', alignItems: 'center' }]}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(20, 12, 50, 0.55)' }, backdrop]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" accessibilityRole="button" />
        </Animated.View>
        <Animated.View
          accessibilityViewIsModal
          accessibilityRole="none"
          aria-modal
          role="dialog"
          aria-label={title}
          style={[
            {
              width: isPhone ? '100%' : Math.min(560, width - 48),
              backgroundColor: c.bg,
              borderTopLeftRadius: 32,
              borderTopRightRadius: 32,
              borderBottomLeftRadius: isPhone ? 0 : 32,
              borderBottomRightRadius: isPhone ? 0 : 32,
              paddingHorizontal: isPhone ? 20 : 32,
              paddingTop: isPhone ? 14 : 24,
              paddingBottom: (isPhone ? insets.bottom : 0) + 28,
              gap: 18,
              boxShadow: `0px -6px 0px 0px ${light.shadow}`,
            },
            panel,
          ]}
        >
          {isPhone ? <View style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: c.line }} /> : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <T v="m" color={c.ink} accessibilityRole="header" style={{ flex: 1 }}>
              {title}
            </T>
            <IconButton icon="close" onPress={onClose} accessibilityLabel="Close" size={40} colors={{ bg: light.card.deep, fg: light.card.ink, lip: LIPS.well }} />
          </View>
          {colors ? children : <CardScope>{children}</CardScope>}
        </Animated.View>
      </View>
    </Modal>
  );
}
