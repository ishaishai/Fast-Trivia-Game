import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';
import type { EntryRow } from '@shared/types';
import type { LeaderboardView } from '@/backend/types';
import { num, signed } from '@/lib/format';
import { useGame } from '@/stores/game';
import { useLayout } from '@/theme/layout';
import { useLight } from '@/theme/LightProvider';
import { ease, useMotionOK } from '@/theme/motion';
import { FONTS, numeralWidth } from '@/theme/typography';
import { Icon } from '../icons';
import { Avatar } from '../profile/Avatar';
import { LiveDot } from '../ui/bits';
import { T } from '../ui/Text';

/**
 * A leaderboard drawn like a race timing tower. Rows slide into their new
 * places as scores land; arrows show who just moved. Your row is always there.
 */
export function TimingTower({ board, limit = 10, rowHeight }: { board: LeaderboardView | null; limit?: number; rowHeight?: number }) {
  const light = useLight();
  const { isPhone } = useLayout();
  const uid = useGame((s) => s.profile?.uid);
  const h = rowHeight ?? (isPhone ? 56 : 60);
  const rows = board?.rows.slice(0, limit) ?? [];
  // Rank and points columns are as wide as the longest number they hold, never narrower than their headers.
  const rankSize = isPhone ? 22 : 26;
  const rankCol = (last: number) => Math.max(isPhone ? 34 : 46, numeralWidth(num(last), rankSize) + 16);
  const scoreCol = Math.max(56, ...[...rows, ...(board?.me ? [board.me] : [])].map((r) => numeralWidth(signed(r.score), isPhone ? 24 : 28)));

  if (!board) {
    return (
      <View style={{ gap: 8 }}>
        {Array.from({ length: Math.min(limit, 6) }, (_, i) => (
          <View key={i} style={{ height: h - 8, borderRadius: 14, backgroundColor: light.raised, opacity: 0.6 - i * 0.08 }} />
        ))}
      </View>
    );
  }

  const meInTop = board.me ? rows.some((r) => r.uid === board.me?.uid) : false;
  return (
    <View role="table" aria-label="Standings">
      <View style={{ flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 10, gap: 12 }} role="row">
        <T v="label" muted style={{ width: rankCol(rows.length) }} role="columnheader">
          Pos
        </T>
        <T v="label" muted style={{ flex: 1 }} role="columnheader">
          Player
        </T>
        {!isPhone ? (
          <T v="label" muted style={{ width: 80, textAlign: 'right' }} role="columnheader">
            Answered
          </T>
        ) : null}
        <T v="label" muted style={{ width: scoreCol, textAlign: 'right' }} role="columnheader">
          Points
        </T>
      </View>
      <View style={{ height: rows.length * h }}>
        {rows.map((row, i) => (
          <TowerRow
            key={row.uid}
            row={row}
            index={i}
            height={h}
            leader={i === 0}
            you={row.uid === uid}
            rankWidth={rankCol(rows.length)}
            scoreWidth={scoreCol}
          />
        ))}
      </View>
      {board.me && board.myRank && !meInTop ? (
        <>
          <View style={{ height: 22, alignItems: 'center', justifyContent: 'center' }}>
            <T v="label" muted>
              · · ·
            </T>
          </View>
          <View style={{ height: h }}>
            <TowerRow row={board.me} index={0} height={h} you position={board.myRank} rankWidth={rankCol(board.myRank)} scoreWidth={scoreCol} />
          </View>
        </>
      ) : null}
    </View>
  );
}

function TowerRow({
  row,
  index,
  height,
  leader,
  you,
  position,
  rankWidth,
  scoreWidth,
}: {
  row: EntryRow;
  index: number;
  height: number;
  leader?: boolean;
  you?: boolean;
  position?: number;
  rankWidth: number;
  scoreWidth: number;
}) {
  const light = useLight();
  const { isPhone } = useLayout();
  const motion = useMotionOK();
  const y = useSharedValue(index * height);
  const fade = useSharedValue(0);
  useEffect(() => {
    y.value = motion ? withTiming(index * height, { duration: 560, easing: ease.inOut }) : index * height;
  }, [height, index, motion, y]);
  useEffect(() => {
    fade.value = withTiming(1, { duration: 400 });
  }, [fade]);
  const style = useAnimatedStyle(() => ({ opacity: fade.value, transform: [{ translateY: y.value }] }));
  const pos = position ?? index + 1;

  // Who just moved: an arrow for a few seconds after a change of place.
  const lastIndex = useRef(index);
  const up = useSharedValue(0);
  const down = useSharedValue(0);
  useEffect(() => {
    const before = lastIndex.current;
    lastIndex.current = index;
    if (before === index || position !== undefined) return;
    const arrow = before > index ? up : down;
    arrow.set(withSequence(withTiming(1, { duration: 200 }), withDelay(3600, withTiming(0, { duration: 400 }))));
  }, [down, index, position, up]);
  const upStyle = useAnimatedStyle(() => ({ opacity: up.value }));
  const downStyle = useAnimatedStyle(() => ({ opacity: down.value }));

  return (
    <Animated.View
      role="row"
      aria-label={`${pos}. @${row.handle}${row.city ? `, ${row.city}` : ''}. ${row.score} points, ${row.answered} answered${row.status === 'live' ? ', playing now' : ''}${you ? '. You' : ''}`}
      style={[
        {
          position: 'absolute',
          left: 0,
          right: 0,
          height: height - 6,
          paddingHorizontal: 12,
          borderRadius: 16,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          backgroundColor: you ? light.sun : leader ? light.raised : 'transparent',
          borderWidth: you ? 0 : 1,
          borderColor: leader ? 'transparent' : light.line,
        },
        style,
      ]}
    >
      <View style={{ width: rankWidth, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <T
          v="m"
          color={you ? light.onSun : light.ink}
          style={{ fontFamily: FONTS.extra, fontSize: isPhone ? 22 : 26, lineHeight: isPhone ? 26 : 30, fontVariant: ['tabular-nums'] }}
        >
          {num(pos)}
        </T>
        <View style={{ width: 12, height: 12 }} aria-hidden>
          <Animated.View style={[{ position: 'absolute' }, upStyle]}>
            <Icon name="up" color={you ? light.onSun : light.sunText} size={12} strokeWidth={2.6} />
          </Animated.View>
          <Animated.View style={[{ position: 'absolute' }, downStyle]}>
            <Icon name="down" color={you ? light.onSun : light.muted} size={12} strokeWidth={2.6} />
          </Animated.View>
        </View>
      </View>
      <Avatar seed={row.avatarSeed} size={isPhone ? 28 : 32} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <T v="title" color={you ? light.onSun : light.ink} fit={0.6} style={{ fontSize: isPhone ? 15 : 17, flexShrink: 1 }}>
            @{row.handle}
          </T>
          {leader ? <Icon name="crown" color={you ? light.onSun : light.sunText} size={15} strokeWidth={2.2} /> : null}
          {row.status === 'live' ? <LiveDot size={6} color={you ? light.onSun : light.sun} /> : null}
        </View>
        {row.city ? (
          <T v="label" color={you ? light.onSun : light.muted} fit={0.8} style={{ fontSize: 10 }}>
            {row.city}
          </T>
        ) : null}
      </View>
      {!isPhone ? (
        <T v="mono" color={you ? light.onSun : light.muted} style={{ width: 80, textAlign: 'right' }}>
          {num(row.answered)}
        </T>
      ) : null}
      <T
        v="m"
        color={you ? light.onSun : leader ? light.sunText : light.ink}
        style={{ width: scoreWidth, textAlign: 'right', fontFamily: FONTS.extra, fontSize: isPhone ? 24 : 28, lineHeight: isPhone ? 28 : 32, fontVariant: ['tabular-nums'] }}
      >
        {signed(row.score)}
      </T>
    </Animated.View>
  );
}
