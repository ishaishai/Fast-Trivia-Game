import { useEffect } from 'react';
import { StyleSheet, useWindowDimensions, type GestureResponderEvent } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { create } from 'zustand';
import { useMotionOK } from '@/theme/motion';

interface Cue {
  id: number;
  x: number;
  y: number;
  color: string;
  onCovered: () => void;
}

const useCurtain = create<{ cue: Cue | null; set: (cue: Cue | null) => void }>()((set) => ({
  cue: null,
  set: (cue) => set({ cue }),
}));

let ids = 0;

/**
 * The sun swallows the screen: a disc grows from where you tapped until it
 * fills the viewport, the next screen mounts underneath, then the disc fades.
 */
export function playCurtain(event: GestureResponderEvent | null | undefined, color: string, onCovered: () => void): void {
  const x = event?.nativeEvent?.pageX ?? 0;
  const y = event?.nativeEvent?.pageY ?? 0;
  useCurtain.getState().set({ id: ++ids, x, y, color, onCovered });
}

export function TransitionOverlay() {
  const cue = useCurtain((s) => s.cue);
  const clear = useCurtain((s) => s.set);
  const motion = useMotionOK();
  const { width, height } = useWindowDimensions();
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (!cue) return;
    if (!motion) {
      cue.onCovered();
      clear(null);
      return;
    }
    scale.value = 0;
    opacity.value = 1;
    scale.value = withTiming(1, { duration: 560, easing: easeInOut }, (done) => {
      if (done) scheduleOnRN(cue.onCovered);
    });
    opacity.value = withDelay(820, withTiming(0, { duration: 420 }, (done) => {
      if (done) scheduleOnRN(clear, null);
    }));
  }, [clear, cue, motion, opacity, scale]);

  const x = cue?.x || width / 2;
  const y = cue?.y || height / 2;
  const r = Math.hypot(Math.max(x, width - x), Math.max(y, height - y)) + 8;
  const animated = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ scale: scale.value }] }));

  if (!cue) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        { zIndex: 50 },
      ]}
    >
      <Animated.View
        style={[
          { position: 'absolute', left: x - r, top: y - r, width: r * 2, height: r * 2, borderRadius: r, backgroundColor: cue.color },
          animated,
        ]}
      />
    </Animated.View>
  );
}

function easeInOut(t: number): number {
  'worklet';
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
