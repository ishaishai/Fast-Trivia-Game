import { useEffect, useState } from 'react';
import { Platform, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useLight } from '@/theme/LightProvider';
import { useMotionOK } from '@/theme/motion';

const INTERACTIVE = 'a,button,input,textarea,[role="button"],[role="link"],[role="switch"],[role="radio"],[role="tab"]';

/**
 * Desktop web only: a soft ring trails the pointer and opens up over anything
 * you can press. The system cursor stays — this is atmosphere, not a replacement.
 */
export function CursorHalo() {
  const light = useLight();
  const motion = useMotionOK();
  const [finePointer] = useState(
    () => Platform.OS === 'web' && typeof window !== 'undefined' && Boolean(window.matchMedia?.('(pointer: fine)').matches),
  );
  const enabled = finePointer && motion;
  const x = useSharedValue(-100);
  const y = useSharedValue(-100);
  const grow = useSharedValue(0);
  const visible = useSharedValue(0);

  useEffect(() => {
    if (!enabled) return;
    const move = (e: PointerEvent) => {
      x.value = withSpring(e.clientX, { damping: 26, stiffness: 260, mass: 0.6 });
      y.value = withSpring(e.clientY, { damping: 26, stiffness: 260, mass: 0.6 });
      visible.value = withSpring(1);
      const target = e.target as Element | null;
      grow.value = withSpring(target?.closest?.(INTERACTIVE) ? 1 : 0, { damping: 18, stiffness: 220 });
    };
    const leave = () => {
      visible.value = withSpring(0);
    };
    window.addEventListener('pointermove', move, { passive: true });
    document.addEventListener('pointerleave', leave);
    return () => {
      window.removeEventListener('pointermove', move);
      document.removeEventListener('pointerleave', leave);
    };
  }, [enabled, grow, visible, x, y]);

  const ring = useAnimatedStyle(() => {
    const size = 26 + grow.value * 30;
    return {
      opacity: visible.value * (0.55 + grow.value * 0.25),
      width: size,
      height: size,
      borderRadius: size / 2,
      transform: [{ translateX: x.value - size / 2 }, { translateY: y.value - size / 2 }],
    };
  });

  if (!enabled) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.ring, { borderColor: light.sun, backgroundColor: light.glow }, ring]}
      aria-hidden
    />
  );
}

const styles = StyleSheet.create({
  ring: {
    position: 'absolute',
    left: 0,
    top: 0,
    borderWidth: 1.5,
    zIndex: 200,
  },
});
