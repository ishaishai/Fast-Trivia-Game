import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming } from 'react-native-reanimated';
import type { EntryRow } from '@shared/types';
import { signed } from '@/lib/format';
import { useGame } from '@/stores/game';
import { useLight } from '@/theme/LightProvider';
import { springs, useMotionOK } from '@/theme/motion';
import { FONTS } from '@/theme/typography';
import { Icon } from '../icons';
import { Float, PopIn } from '../motion/Playful';
import { Avatar } from '../profile/Avatar';
import { T } from '../ui/Text';

const BLOCKS = [
  { bg: '#FFC83D', lip: '#B87800', ink: '#3D2500' },
  { bg: '#BFE3FF', lip: '#6FA8D8', ink: '#0B2252' },
  { bg: '#FFC1A1', lip: '#D9825A', ink: '#4A1A00' },
];

/**
 * The top three on blocks. Third rises first, then second, then the winner,
 * whose crown bobs above them. Names never get cut short.
 */
export function Podium({ rows, compact }: { rows: EntryRow[]; compact?: boolean }) {
  const top = rows.slice(0, 3);
  // Seats left to right: second, first, third.
  const seats = [1, 0, 2];
  const heights = compact ? [96, 72, 56] : [132, 100, 80];
  return (
    <View
      style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingTop: 8 }}
      accessible
      accessibilityLabel={top.length ? `Top ${top.length}: ${top.map((r, i) => `${i + 1}. @${r.handle}, ${r.score} points`).join('; ')}` : 'No players yet'}
    >
      {seats.map((place) => (
        <Seat key={place} place={place} row={top[place] ?? null} height={heights[place]} compact={compact} />
      ))}
    </View>
  );
}

function Seat({ place, row, height, compact }: { place: number; row: EntryRow | null; height: number; compact?: boolean }) {
  const light = useLight();
  const uid = useGame((s) => s.profile?.uid);
  const motion = useMotionOK();
  const rise = useSharedValue(motion ? 0 : 1);
  // Third, second, first: the winner lands last.
  const delay = [300, 150, 0][place];
  useEffect(() => {
    if (!motion) return;
    rise.set(withDelay(delay, withSpring(1, springs.bouncy)));
  }, [delay, motion, rise]);
  const block = useAnimatedStyle(() => ({ transform: [{ scaleY: Math.max(0.05, rise.value) }] }));
  const badge = useAnimatedStyle(() => ({ opacity: withTiming(rise.value > 0.6 ? 1 : 0, { duration: 160 }) }));
  const b = BLOCKS[place];
  const you = row?.uid === uid;
  const avatar = place === 0 ? (compact ? 52 : 64) : compact ? 42 : 52;
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <PopIn delay={delay + 260} from={0.4} style={{ alignItems: 'center', gap: 4, marginBottom: 8, width: '100%' }}>
        {place === 0 && row ? (
          <Float amplitude={4} rotate={6} style={{ marginBottom: -6 }}>
            <Icon name="crown" color="#FFC83D" size={compact ? 28 : 34} strokeWidth={2.6} filled />
          </Float>
        ) : null}
        {row ? (
          <>
            <View style={{ borderRadius: avatar, borderWidth: 3, borderColor: you ? light.sun : '#FFFFFF', boxShadow: `0px 3px 0px 0px ${light.shadow}` }}>
              <Avatar seed={row.avatarSeed} size={avatar} />
            </View>
            <T v="label" fit={0.6} align="center" style={{ fontSize: 14, alignSelf: 'stretch' }}>
              {you ? 'You!' : `@${row.handle}`}
            </T>
          </>
        ) : (
          <View style={{ width: avatar, height: avatar, borderRadius: avatar, backgroundColor: 'rgba(255, 255, 255, 0.35)' }} />
        )}
      </PopIn>
      <Animated.View
        style={[
          {
            alignSelf: 'stretch',
            height,
            borderTopLeftRadius: 18,
            borderTopRightRadius: 18,
            borderBottomLeftRadius: 8,
            borderBottomRightRadius: 8,
            backgroundColor: b.bg,
            boxShadow: `0px 5px 0px 0px ${b.lip}`,
            alignItems: 'center',
            paddingTop: 8,
            transformOrigin: 'bottom',
            opacity: row ? 1 : 0.45,
          },
          block,
        ]}
      >
        <T v="xl" color={b.ink} style={{ fontFamily: FONTS.display, fontSize: compact ? 30 : 40, lineHeight: compact ? 36 : 46 }}>
          {String(place + 1)}
        </T>
        {row ? (
          <Animated.View style={[{ marginTop: 2, paddingHorizontal: 8, height: 24, borderRadius: 12, backgroundColor: 'rgba(255, 255, 255, 0.7)', justifyContent: 'center' }, badge]}>
            <T v="label" color={b.ink} fit={0.7} style={{ fontSize: 14 }}>
              {signed(row.score)}
            </T>
          </Animated.View>
        ) : null}
      </Animated.View>
    </View>
  );
}
