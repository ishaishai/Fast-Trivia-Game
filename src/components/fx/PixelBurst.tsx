import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState, type ComponentRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { fx, useMotionOK } from '@/theme/motion';

export interface BurstOpts {
  /** where it starts, in window coordinates */
  x: number;
  y: number;
  colors: readonly string[];
  count?: number;
  /** how far the pixels fly out, px */
  spread?: number;
  duration?: number;
  /** swoop into this point (window coordinates) instead of falling */
  toward?: { x: number; y: number } | null;
}

export interface BurstHandle {
  fire(opts: BurstOpts): void;
}

interface Seed {
  dx: number;
  dy: number;
  size: number;
  spin: number;
  color: string;
}

interface Live extends BurstOpts {
  id: number;
  seeds: Seed[];
}

/** A few pixels flying out in a ring, a little uneven so it looks thrown. */
function seedsFor(opts: BurstOpts): Seed[] {
  const n = Math.min(opts.count ?? 8, fx.maxBurst);
  const spread = opts.spread ?? 70;
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 + (Math.random() - 0.5) * 0.6;
    const r = spread * (0.6 + Math.random() * 0.5);
    return {
      dx: Math.cos(a) * r,
      dy: Math.sin(a) * r - spread * 0.25,
      size: 7 + Math.random() * 6,
      spin: (Math.random() - 0.5) * 540,
      color: opts.colors[i % opts.colors.length] ?? '#FFFFFF',
    };
  });
}

/**
 * Fires bursts of rounded pixels: a correct answer, a crown. Mount one per
 * screen, last, so it draws above everything (the run is a native modal, so
 * it needs its own). Nothing fires under reduced motion.
 */
export const BurstHost = forwardRef<BurstHandle>(function BurstHost(_props, ref) {
  const motion = useMotionOK();
  const [bursts, setBursts] = useState<Live[]>([]);
  const next = useRef(0);
  const origin = useRef({ x: 0, y: 0 });
  const host = useRef<ComponentRef<typeof View>>(null);
  useImperativeHandle(
    ref,
    () => ({
      fire(opts) {
        if (!motion) return;
        const { x, y } = origin.current;
        const live: Live = {
          ...opts,
          x: opts.x - x,
          y: opts.y - y,
          toward: opts.toward ? { x: opts.toward.x - x, y: opts.toward.y - y } : null,
          id: ++next.current,
          seeds: seedsFor(opts),
        };
        setBursts((list) => [...list.slice(-2), live]);
      },
    }),
    [motion],
  );
  const done = useCallback((id: number) => setBursts((list) => list.filter((b) => b.id !== id)), []);
  return (
    <View
      ref={host}
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      onLayout={() => host.current?.measureInWindow((x, y) => (origin.current = { x, y }))}
      aria-hidden
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {bursts.map((b) => (
        <Burst key={b.id} burst={b} onDone={done} />
      ))}
    </View>
  );
});

function Burst({ burst, onDone }: { burst: Live; onDone: (id: number) => void }) {
  const p = useSharedValue(0);
  const { id, duration = 520 } = burst;
  useEffect(() => {
    p.set(
      withTiming(1, { duration, easing: Easing.out(Easing.quad) }, (finished) => {
        if (finished) scheduleOnRN(onDone, id);
      }),
    );
  }, [duration, id, onDone, p]);
  return burst.seeds.map((seed, i) => <Pixel key={i} p={p} seed={seed} burst={burst} />);
}

function Pixel({ p, seed, burst }: { p: SharedValue<number>; seed: Seed; burst: Live }) {
  const { x, y, toward } = burst;
  const animated = useAnimatedStyle(() => {
    const t = p.value;
    let px: number;
    let py: number;
    if (toward) {
      // Out to a control point, then curving into the target.
      const cx = x + seed.dx * 1.4;
      const cy = y + seed.dy * 1.4;
      const u = 1 - t;
      px = u * u * x + 2 * u * t * cx + t * t * toward.x;
      py = u * u * y + 2 * u * t * cy + t * t * toward.y;
    } else {
      px = x + seed.dx * t;
      py = y + seed.dy * t + 160 * t * t;
    }
    return {
      opacity: t < 0.75 ? 1 : (1 - t) * 4,
      transform: [
        { translateX: px - seed.size / 2 },
        { translateY: py - seed.size / 2 },
        { rotate: `${seed.spin * t}deg` },
        { scale: toward ? 1 - t * 0.6 : 1 - t * 0.3 },
      ],
    };
  });
  return (
    <Animated.View
      style={[
        { position: 'absolute', left: 0, top: 0, width: seed.size, height: seed.size, borderRadius: seed.size * 0.3, backgroundColor: seed.color },
        animated,
      ]}
    />
  );
}
