import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { copy } from '@/copy/en';
import { signed } from '@/lib/format';
import type { RunPhase } from '@/run/useRunController';
import { SIGNAL, type Light } from '@/theme/palette';
import { FONTS, glyphRoom } from '@/theme/typography';
import { Icon } from '../icons';
import { Odometer } from '../motion/Kinetic';
import { LiveDot } from '../ui/bits';
import { Tap } from '../ui/Tap';
import { T } from '../ui/Text';

export function RoundButton({
  icon,
  label,
  onPress,
  ink,
  line,
}: {
  icon: 'close' | 'sound' | 'mute';
  label: string;
  onPress: () => void;
  ink: string;
  line: string;
}) {
  return (
    <Tap
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ hovered }) => ({
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: hovered ? ink : line,
      })}
    >
      <Icon name={icon} color={ink} size={20} />
    </Tap>
  );
}

/** Competition name, live marker, sound and quit. */
export function RunTopBar({
  title,
  practice,
  light,
  sound,
  onSound,
  onQuit,
  canQuit,
}: {
  title: string;
  practice: boolean;
  light: Light;
  sound: boolean;
  onSound: () => void;
  onQuit: () => void;
  canQuit: boolean;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        {practice ? null : <LiveDot color={light.sun} size={7} />}
        <T v="label" color={light.ink} numberOfLines={1}>
          {practice ? `${copy.run.practice} · unranked` : title}
        </T>
      </View>
      <RoundButton icon={sound ? 'sound' : 'mute'} label={sound ? 'Mute sounds' : 'Turn sounds on'} onPress={onSound} ink={light.ink} line={light.line} />
      {canQuit ? <RoundButton icon="close" label={copy.run.quit} onPress={onQuit} ink={light.ink} line={light.line} /> : null}
    </View>
  );
}

/** Seconds of daylight left, ticking by this device's clock. */
export function RunClock({ read, phase, size, light }: { read: () => number; phase: RunPhase; size: number; light: Light }) {
  const [left, setLeft] = useState(() => Math.ceil(read() / 1000));
  useEffect(() => {
    const id = setInterval(() => setLeft(Math.ceil(read() / 1000)), 100);
    return () => clearInterval(id);
  }, [read, phase]);
  const urgent = left <= 5 && phase !== 'ready' && phase !== 'intro';
  return (
    <View accessible accessibilityLabel={`${left} seconds left`}>
      <T
        v="hero"
        color={urgent ? light.sun : light.ink}
        style={{ fontFamily: FONTS.black, fontSize: size, lineHeight: size * 0.92, letterSpacing: -size * 0.01, fontVariant: ['tabular-nums'] }}
      >
        {String(left).padStart(2, '0')}
      </T>
      <T v="label" color={light.ink} style={{ opacity: 0.8 }}>
        {copy.run.secondsLeft}
      </T>
    </View>
  );
}

/** Score, live rank and the +3 / −1 that just landed. */
export function RunScore({
  score,
  rank,
  rankDelta,
  streak,
  lastDelta,
  size,
  light,
  align = 'right',
}: {
  score: number;
  rank: number | null;
  rankDelta: number;
  streak: number;
  lastDelta: { value: number; key: number } | null;
  size: number;
  light: Light;
  align?: 'left' | 'right';
}) {
  return (
    <View style={{ alignItems: align === 'right' ? 'flex-end' : 'flex-start', gap: 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        {lastDelta ? <DeltaPop key={lastDelta.key} value={lastDelta.value} /> : null}
        <Odometer
          value={signed(score)}
          accessibilityLabel={`${score} points`}
          style={{ fontFamily: FONTS.black, fontSize: size, lineHeight: size * 0.96, color: light.ink, letterSpacing: -size * 0.01 }}
        />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        {streak >= 3 ? (
          <T v="label" color={light.sun}>
            {copy.run.streak(streak)}
          </T>
        ) : null}
        <T v="label" color={light.ink} style={{ opacity: 0.8 }}>
          {copy.run.points}
        </T>
        {rank !== null ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, height: 24, borderRadius: 12, backgroundColor: light.sun }}>
            <T v="label" color={light.onSun} style={{ letterSpacing: 0.4 }}>
              #{rank}
            </T>
            {rankDelta !== 0 ? <Icon name={rankDelta > 0 ? 'up' : 'down'} color={light.onSun} size={12} strokeWidth={2.6} /> : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

function DeltaPop({ value }: { value: number }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withSequence(withSpring(1, { damping: 11, stiffness: 240 }), withDelay(420, withTiming(2, { duration: 380 })));
  }, [p]);
  const style = useAnimatedStyle(() => ({
    opacity: p.value <= 1 ? p.value : 2 - p.value,
    transform: [{ translateY: p.value > 1 ? -(p.value - 1) * 18 : (1 - p.value) * 10 }, { scale: 0.7 + Math.min(1, p.value) * 0.3 }],
  }));
  const good = value > 0;
  return (
    <Animated.View
      style={[{ paddingHorizontal: 10, height: 30, borderRadius: 15, justifyContent: 'center', backgroundColor: good ? SIGNAL.correct : SIGNAL.wrong }, style]}
    >
      <T v="label" color={good ? SIGNAL.onCorrect : SIGNAL.onWrong} style={{ fontSize: 14, letterSpacing: 0.5 }}>
        {signed(value)}
      </T>
    </Animated.View>
  );
}

/** Sunrise in 3 · 2 · 1. */
export function IntroCountdown({ light, size }: { light: Light; size: number }) {
  const [n, setN] = useState(3);
  const p = useSharedValue(0);
  const first = useRef(true);
  useEffect(() => {
    const a = setTimeout(() => setN(2), 800);
    const b = setTimeout(() => setN(1), 1600);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, []);
  useEffect(() => {
    p.value = first.current ? 0 : 0;
    first.current = false;
    p.value = withTiming(1, { duration: 760, easing: Easing.out(Easing.cubic) });
  }, [n, p]);
  const style = useAnimatedStyle(() => ({ opacity: 1 - p.value * 0.85, transform: [{ scale: 1.25 - p.value * 0.25 }] }));
  const numeral = { fontFamily: FONTS.black, fontSize: size, lineHeight: size, color: light.ink };
  return (
    <View pointerEvents="none" style={{ alignItems: 'center', gap: 8 }} accessibilityLiveRegion="assertive">
      <T v="label" color={light.ink}>
        Sunrise in
      </T>
      <Animated.Text key={n} style={[numeral, glyphRoom(numeral), style]}>
        {n}
      </Animated.Text>
    </View>
  );
}

export function SunsetTitle({ light, size }: { light: Light; size: number }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(250, withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) }));
  }, [p]);
  const style = useAnimatedStyle(() => ({ opacity: p.value, transform: [{ translateY: (1 - p.value) * 24 }] }));
  return (
    <Animated.View style={style} pointerEvents="none" accessibilityLiveRegion="assertive">
      <T v="hero" color={light.ink} style={{ fontSize: size, lineHeight: size * 0.92 }}>
        {copy.run.sunset}
      </T>
    </Animated.View>
  );
}
