import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import type { EntryRow } from '@shared/types';
import type { LeaderboardView } from '@/backend/types';
import { num, signed } from '@/lib/format';
import { useGame } from '@/stores/game';
import { useLayout } from '@/theme/layout';
import { CardScope, useLight } from '@/theme/LightProvider';
import { springs, useMotionOK } from '@/theme/motion';
import { SIGNAL } from '@/theme/palette';
import { flatShadow } from '@/theme/shape';
import { FONTS, numeralWidth } from '@/theme/typography';
import { Icon } from '../icons';
import { Avatar } from '../profile/Avatar';
import { LiveDot } from '../ui/bits';
import { T } from '../ui/Text';

/**
 * The leaderboard as a stack of white rows that slide into their new places
 * as scores land; an arrow shows who just moved. Your row is sun-coloured and
 * always there. `offset` skips rows a podium already shows.
 */
export function TimingTower({ board, limit = 10, offset = 0, rowHeight }: { board: LeaderboardView | null; limit?: number; offset?: number; rowHeight?: number }) {
  const light = useLight();
  const { isPhone } = useLayout();
  const uid = useGame((s) => s.profile?.uid);
  const h = rowHeight ?? (isPhone ? 62 : 66);
  const rows = board?.rows.slice(offset, limit) ?? [];
  // Rank and points columns are as wide as the longest number they hold.
  const rankSize = isPhone ? 20 : 22;
  const rankCol = (last: number) => Math.max(32, numeralWidth(num(last), rankSize) + 6);
  const scoreCol = Math.max(48, ...[...rows, ...(board?.me ? [board.me] : [])].map((r) => numeralWidth(signed(r.score), isPhone ? 20 : 22)));

  if (!board) {
    return (
      <View style={{ gap: 8 }}>
        {Array.from({ length: Math.min(limit - offset, 6) }, (_, i) => (
          <View key={i} style={{ height: h - 10, borderRadius: 18, backgroundColor: '#FFFFFF', opacity: 0.5 - i * 0.07 }} />
        ))}
      </View>
    );
  }

  const meShown = board.me ? board.rows.slice(0, limit).some((r) => r.uid === board.me?.uid) : false;
  return (
    <View role="table" aria-label="Standings">
      <View style={{ height: rows.length * h }}>
        {rows.map((row, i) => (
          <TowerRow
            key={row.uid}
            row={row}
            index={i}
            position={offset + i + 1}
            height={h}
            you={row.uid === uid}
            rankWidth={rankCol(offset + rows.length)}
            scoreWidth={scoreCol}
          />
        ))}
      </View>
      {board.me && board.myRank && !meShown ? (
        <>
          <View style={{ height: 26, alignItems: 'center', justifyContent: 'center' }}>
            <T v="label" color={light.ink}>
              • • •
            </T>
          </View>
          <View style={{ height: h }}>
            <TowerRow row={board.me} index={0} position={board.myRank} height={h} you pinned rankWidth={rankCol(board.myRank)} scoreWidth={scoreCol} />
          </View>
        </>
      ) : null}
    </View>
  );
}

function TowerRow({
  row,
  index,
  position,
  height,
  you,
  pinned,
  rankWidth,
  scoreWidth,
}: {
  row: EntryRow;
  index: number;
  position: number;
  height: number;
  you?: boolean;
  /** shown apart from the list, so it never slides */
  pinned?: boolean;
  rankWidth: number;
  scoreWidth: number;
}) {
  const light = useLight();
  const { isPhone } = useLayout();
  const motion = useMotionOK();
  const y = useSharedValue(index * height);
  const pop = useSharedValue(motion ? 0 : 1);
  useEffect(() => {
    y.set(motion ? withSpring(index * height, springs.pop) : index * height);
  }, [height, index, motion, y]);
  useEffect(() => {
    if (motion) pop.set(withDelay(Math.min(index, 8) * 40, withSpring(1, springs.pop)));
  }, [index, motion, pop]);
  const style = useAnimatedStyle(() => ({ opacity: Math.min(1, pop.value * 1.6), transform: [{ translateY: y.value }, { scale: 0.92 + 0.08 * pop.value }] }));

  // Who just moved: an arrow for a few seconds after a change of place.
  const lastIndex = useRef(index);
  const up = useSharedValue(0);
  const down = useSharedValue(0);
  useEffect(() => {
    const before = lastIndex.current;
    lastIndex.current = index;
    if (before === index || pinned) return;
    const arrow = before > index ? up : down;
    arrow.set(withSequence(withTiming(1, { duration: 200 }), withDelay(3600, withTiming(0, { duration: 400 }))));
  }, [down, index, pinned, up]);
  const upStyle = useAnimatedStyle(() => ({ opacity: up.value }));
  const downStyle = useAnimatedStyle(() => ({ opacity: down.value }));

  const ink = you ? light.onSun : light.card.ink;
  const muted = you ? light.onSun : light.card.muted;
  return (
    <Animated.View
      role="row"
      aria-label={`${position}. @${row.handle}${row.city ? `, ${row.city}` : ''}. ${row.score} points${row.status === 'live' ? ', playing now' : ''}${you ? '. You' : ''}`}
      style={[
        {
          position: 'absolute',
          left: 0,
          right: 0,
          height: height - 10,
          paddingHorizontal: 12,
          borderRadius: 18,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          backgroundColor: you ? light.sun : '#FFFFFF',
          boxShadow: flatShadow(light, 4),
        },
        style,
      ]}
    >
      <CardScope>
        <View style={{ width: rankWidth, flexDirection: 'row', alignItems: 'center' }}>
          <T v="m" color={ink} style={{ fontFamily: FONTS.num, fontSize: isPhone ? 20 : 22, lineHeight: isPhone ? 24 : 26 }}>
            {num(position)}
          </T>
        </View>
        <Avatar seed={row.avatarSeed} size={isPhone ? 34 : 38} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <T v="title" color={ink} fit={0.6} style={{ fontSize: isPhone ? 16 : 17, flexShrink: 1 }}>
              {you ? `@${row.handle} (you)` : `@${row.handle}`}
            </T>
            {row.status === 'live' ? <LiveDot size={6} color={you ? light.onSun : SIGNAL.wrong} /> : null}
          </View>
          {row.city ? (
            <T v="label" color={muted} fit={0.8} style={{ fontSize: 12, lineHeight: 15 }}>
              {row.city}
            </T>
          ) : null}
        </View>
        <View style={{ width: 14, height: 14 }} aria-hidden>
          <Animated.View style={[{ position: 'absolute' }, upStyle]}>
            <Icon name="up" color={you ? light.onSun : SIGNAL.correctLip} size={14} strokeWidth={3} />
          </Animated.View>
          <Animated.View style={[{ position: 'absolute' }, downStyle]}>
            <Icon name="down" color={you ? light.onSun : SIGNAL.wrongLip} size={14} strokeWidth={3} />
          </Animated.View>
        </View>
        <T v="m" color={ink} style={{ width: scoreWidth, textAlign: 'right', fontFamily: FONTS.num, fontSize: isPhone ? 20 : 22, lineHeight: isPhone ? 24 : 26 }}>
          {signed(row.score)}
        </T>
      </CardScope>
    </Animated.View>
  );
}
