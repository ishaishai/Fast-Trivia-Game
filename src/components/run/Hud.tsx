import { forwardRef, useEffect, useState, type ComponentRef, type ReactNode } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { copy } from '@/copy/en';
import { num, signed } from '@/lib/format';
import type { RunPhase } from '@/run/useRunController';
import { INTRO_STEP_MS } from '@/run/windows';
import { springs, useMotionOK } from '@/theme/motion';
import { CARD, SIGNAL, SUNNY, TINTS, WHITE, type Light } from '@/theme/palette';
import { FONTS } from '@/theme/typography';
import { Icon } from '../icons';
import { Odometer } from '../motion/Kinetic';
import { Pulse } from '../motion/Playful';
import { IconButton } from '../ui/Button';
import { LiveDot } from '../ui/bits';
import { T } from '../ui/Text';

const PILL = { backgroundColor: WHITE, borderRadius: 999, boxShadow: '0px 4px 0px 0px rgba(34, 27, 69, 0.18)' } as const;

/** Quit and sound at the ends; in between, the game's name — or, on a phone mid-game, the clock and score. */
export function RunTopBar({
  title,
  practice,
  sound,
  onSound,
  onQuit,
  canQuit,
  children,
}: {
  title: string;
  practice: boolean;
  sound: boolean;
  onSound: () => void;
  onQuit: () => void;
  canQuit: boolean;
  children?: ReactNode;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      {canQuit ? <IconButton icon="close" onPress={onQuit} accessibilityLabel={copy.run.quit} /> : <View style={{ width: 44 }} />}
      {children ? (
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>{children}</View>
      ) : (
        <View style={{ flex: 1, alignItems: 'center' }}>
          <View style={[PILL, { flexDirection: 'row', alignItems: 'center', gap: 8, height: 36, paddingHorizontal: 14, maxWidth: '100%' }]}>
            {practice ? <Icon name="sparkle" color={CARD.sunText} size={14} filled /> : <LiveDot color={SIGNAL.wrong} size={7} />}
            <T v="label" color={CARD.ink} numberOfLines={1} style={{ flexShrink: 1 }}>
              {practice ? copy.run.practiceTag : title}
            </T>
          </View>
        </View>
      )}
      <IconButton icon={sound ? 'sound' : 'mute'} onPress={onSound} accessibilityLabel={sound ? 'Mute sounds' : 'Turn sounds on'} />
    </View>
  );
}

/** Seconds left in the run, ticking by this device's clock. Turns orange and throbs for the last five. */
export function RunClock({ read, phase, size }: { read: () => number; phase: RunPhase; size: number }) {
  const [left, setLeft] = useState(() => Math.ceil(read() / 1000));
  useEffect(() => {
    const id = setInterval(() => setLeft(Math.ceil(read() / 1000)), 100);
    return () => clearInterval(id);
  }, [read, phase]);
  const urgent = left <= 5 && phase !== 'ready' && phase !== 'intro';
  const ink = urgent ? SIGNAL.onWarn : CARD.ink;
  return (
    <Pulse active={urgent} scale={1.08} period={1000}>
      <View
        accessible
        accessibilityLabel={`${left} seconds left`}
        style={[PILL, { flexDirection: 'row', alignItems: 'center', gap: 8, height: size, paddingHorizontal: size * 0.32, backgroundColor: urgent ? SIGNAL.warn : WHITE }]}
      >
        <Icon name="clock" color={ink} size={size * 0.46} strokeWidth={2.6} />
        <T v="m" color={ink} style={{ fontFamily: FONTS.num, fontSize: size * 0.5, lineHeight: size * 0.62, minWidth: size * 0.6 }}>
          {String(Math.max(0, left))}
        </T>
      </View>
    </Pulse>
  );
}

/** Score with a star, the +3 / −1 that just landed, your streak and live rank. */
/**
 * Score with a star and the +3 / −1 that just landed. In the roomy layout a
 * streak and live-rank row sits above it; on a phone (`compact`) the streak
 * is a badge on the pill and the rank waits for the results.
 */
export const RunScore = forwardRef<
  ComponentRef<typeof View>,
  {
    score: number;
    rank: number | null;
    rankDelta: number;
    streak: number;
    lastDelta: { value: number; key: number } | null;
    size: number;
    light: Light;
    compact?: boolean;
  }
>(function RunScore({ score, rank, rankDelta, streak, lastDelta, size, compact }, ref) {
  const extras = !compact && (streak >= 3 || rank !== null);
  return (
    <View style={{ alignItems: 'flex-end', gap: 8 }}>
      {extras ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {streak >= 3 ? (
            <View style={[PILL, { flexDirection: 'row', alignItems: 'center', gap: 4, height: 26, paddingHorizontal: 10, backgroundColor: TINTS.peach }]}>
              <Icon name="fire" color={SIGNAL.warn} size={14} filled />
              <T v="label" color={TINTS.onPeach} style={{ fontSize: 13 }}>
                {copy.run.streak(streak)}
              </T>
            </View>
          ) : null}
          {rank !== null ? (
            <View style={[PILL, { flexDirection: 'row', alignItems: 'center', gap: 4, height: 26, paddingHorizontal: 10 }]}>
              <T v="label" color={CARD.ink} style={{ fontSize: 13 }}>
                #{num(rank)}
              </T>
              {rankDelta !== 0 ? <Icon name={rankDelta > 0 ? 'up' : 'down'} color={rankDelta > 0 ? SIGNAL.correctLip : SIGNAL.wrongLip} size={13} strokeWidth={3} /> : null}
            </View>
          ) : null}
        </View>
      ) : null}
      <View>
        <View ref={ref} collapsable={false} style={[PILL, { flexDirection: 'row', alignItems: 'center', gap: 8, height: size, paddingLeft: size * 0.24, paddingRight: size * 0.34 }]}>
          <Bump trigger={lastDelta?.key ?? 0} good={(lastDelta?.value ?? 0) > 0}>
            <Icon name="star" color={SUNNY.body} size={size * 0.56} strokeWidth={2} filled />
          </Bump>
          <Odometer
            value={signed(score)}
            accessibilityLabel={`${score} points`}
            style={{ fontFamily: FONTS.num, fontSize: size * 0.5, lineHeight: size * 0.62, color: CARD.ink }}
          />
        </View>
        {compact && streak >= 3 ? (
          <View
            accessible
            accessibilityLabel={copy.run.streak(streak)}
            style={{ position: 'absolute', top: -8, left: -10, flexDirection: 'row', alignItems: 'center', gap: 2, height: 24, paddingHorizontal: 7, borderRadius: 12, backgroundColor: TINTS.peach, borderWidth: 2, borderColor: WHITE }}
          >
            <Icon name="fire" color={SIGNAL.warn} size={12} filled />
            <T v="label" color={TINTS.onPeach} style={{ fontSize: 12, lineHeight: 15 }}>
              {String(streak)}
            </T>
          </View>
        ) : null}
        {/* The +3 pops out of the score and floats off into the sky; it never pushes the layout or covers the clock. */}
        {lastDelta ? (
          <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
            <DeltaPop key={lastDelta.key} value={lastDelta.value} lift={compact ? size : -size} />
          </View>
        ) : null}
      </View>
    </View>
  );
});

/** The star jumps when points land. */
function Bump({ trigger, good, children }: { trigger: number; good: boolean; children: ReactNode }) {
  const motion = useMotionOK();
  const s = useSharedValue(1);
  useEffect(() => {
    if (!trigger || !motion || !good) return;
    s.set(withSequence(withTiming(1.45, { duration: 110 }), withSpring(1, springs.wobble)));
  }, [good, motion, s, trigger]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: s.value }, { rotate: `${(s.value - 1) * 40}deg` }] }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

function DeltaPop({ value, lift }: { value: number; lift: number }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.set(withSequence(withSpring(1, springs.pop), withDelay(420, withTiming(2, { duration: 380 }))));
  }, [p]);
  // Out of the pill by `lift` (down on a phone, up where there's sky above), a beat there, then away and gone.
  const away = Math.sign(lift) * 18;
  const style = useAnimatedStyle(() => ({
    opacity: p.value <= 1 ? Math.min(1, p.value * 1.5) : 2 - p.value,
    transform: [{ translateY: p.value <= 1 ? p.value * lift * 0.95 : lift * 0.95 + (p.value - 1) * away }, { scale: 0.5 + Math.min(1.1, p.value) * 0.5 }],
  }));
  const good = value > 0;
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          paddingHorizontal: 12,
          height: 34,
          borderRadius: 17,
          justifyContent: 'center',
          backgroundColor: good ? SIGNAL.correct : SIGNAL.wrong,
          boxShadow: `0px 3px 0px 0px ${good ? SIGNAL.correctLip : SIGNAL.wrongLip}`,
        },
        style,
      ]}
    >
      <T v="label" color={good ? SIGNAL.onCorrect : SIGNAL.onWrong} style={{ fontSize: 18, lineHeight: 22 }}>
        {signed(value)}
      </T>
    </Animated.View>
  );
}

/** "Get ready!" then 3 · 2 · 1, each number popping into a bubble. Fits exactly inside the intro. */
export function IntroCountdown({ size }: { size: number }) {
  const [n, setN] = useState(3);
  useEffect(() => {
    const a = setTimeout(() => setN(2), INTRO_STEP_MS);
    const b = setTimeout(() => setN(1), INTRO_STEP_MS * 2);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, []);
  return (
    <View pointerEvents="none" style={{ alignItems: 'center', gap: 10 }} accessibilityLiveRegion="assertive">
      <View style={[PILL, { height: 34, paddingHorizontal: 16, justifyContent: 'center' }]}>
        <T v="label" color={CARD.ink} style={{ fontSize: 15 }}>
          {copy.run.getReady}
        </T>
      </View>
      <Bubble key={n} size={size}>
        {String(n)}
      </Bubble>
    </View>
  );
}

function Bubble({ size, children }: { size: number; children: string }) {
  const motion = useMotionOK();
  const p = useSharedValue(motion ? 0 : 1);
  useEffect(() => {
    if (motion) p.set(withSpring(1, springs.bouncy));
  }, [motion, p]);
  const style = useAnimatedStyle(() => ({ opacity: Math.min(1, p.value * 2), transform: [{ scale: 0.3 + 0.7 * p.value }, { rotate: `${(1 - p.value) * -20}deg` }] }));
  return (
    <Animated.View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: WHITE,
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0px 6px 0px 0px rgba(34, 27, 69, 0.2)',
        },
        style,
      ]}
    >
      <T v="hero" color={CARD.sunText} style={{ fontFamily: FONTS.display, fontSize: size * 0.62, lineHeight: size * 0.72 }}>
        {children}
      </T>
    </Animated.View>
  );
}

/** "Time's up!" — after the last question; the results wait for it. */
export function SunsetTitle({ size }: { size: number }) {
  const motion = useMotionOK();
  const p = useSharedValue(motion ? 0 : 1);
  useEffect(() => {
    if (motion) p.set(withDelay(150, withSpring(1, springs.bouncy)));
  }, [motion, p]);
  const style = useAnimatedStyle(() => ({ opacity: Math.min(1, p.value * 2), transform: [{ scale: 0.4 + 0.6 * p.value }] }));
  return (
    <Animated.View style={[PILL, { paddingHorizontal: 26, paddingVertical: 10, borderRadius: 28 }, style]} pointerEvents="none" accessibilityLiveRegion="assertive">
      <T v="xl" color={CARD.ink} style={{ fontSize: size * 0.5, lineHeight: size * 0.62 }}>
        {copy.run.timesUp}
      </T>
    </Animated.View>
  );
}
