import { useEffect, useState, type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';
import { useLayout } from '@/theme/layout';
import { useLight } from '@/theme/LightProvider';
import { dur, ease } from '@/theme/motion';
import { Icon } from '../icons';
import { Tap } from './Tap';
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
  const { isPhone, width } = useLayout();
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const p = useSharedValue(0);
  const c = colors ?? { bg: light.raised, ink: light.ink, muted: light.muted, line: light.line };
  // Opening mounts immediately; closing unmounts after the exit animation.
  if (visible && !mounted) setMounted(true);

  useEffect(() => {
    if (visible) {
      p.set(withTiming(1, { duration: dur.base, easing: ease.out }));
    } else {
      p.set(
        withTiming(0, { duration: dur.short, easing: ease.in }, (done) => {
          if (done) scheduleOnRN(setMounted, false);
        }),
      );
    }
  }, [p, visible]);

  const backdrop = useAnimatedStyle(() => ({ opacity: p.value }));
  const panel = useAnimatedStyle(() => ({
    opacity: isPhone ? 1 : p.value,
    transform: [{ translateY: (1 - p.value) * (isPhone ? 420 : 24) }],
  }));

  if (!mounted) return null;
  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={[StyleSheet.absoluteFill, { justifyContent: isPhone ? 'flex-end' : 'center', alignItems: 'center' }]}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(4, 5, 16, 0.62)' }, backdrop]}>
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
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              borderBottomLeftRadius: isPhone ? 0 : 28,
              borderBottomRightRadius: isPhone ? 0 : 28,
              paddingHorizontal: isPhone ? 20 : 32,
              paddingTop: 24,
              paddingBottom: (isPhone ? insets.bottom : 0) + 28,
              gap: 18,
            },
            panel,
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <T v="s" color={c.ink} accessibilityRole="header" style={{ flex: 1 }}>
              {title}
            </T>
            <Tap
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close"
              style={({ hovered }) => ({
                width: 40,
                height: 40,
                borderRadius: 20,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: hovered ? c.ink : c.line,
              })}
            >
              <Icon name="close" color={c.ink} size={18} />
            </Tap>
          </View>
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}
