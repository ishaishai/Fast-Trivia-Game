import { router, useLocalSearchParams } from 'expo-router';
import Head from 'expo-router/head';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KINDS, SESSIONS, competitionId, parseCompetitionId, phaseOf } from '@shared/schedule';
import type { Competition, CompetitionKind } from '@shared/types';
import { useBackend } from '@/backend/BackendProvider';
import { PopIn } from '@/components/motion/Playful';
import { useTabBarSpace } from '@/components/nav/TabBar';
import { Avatar } from '@/components/profile/Avatar';
import { SessionTile } from '@/components/sky/SessionTile';
import { Podium } from '@/components/standings/Podium';
import { TimingTower } from '@/components/standings/TimingTower';
import { Winners } from '@/components/standings/Winners';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Container, Page } from '@/components/ui/Page';
import { Chip } from '@/components/ui/bits';
import { T } from '@/components/ui/Text';
import { Segmented } from '@/components/ui/Toggle';
import type { LeaderboardView } from '@/backend/types';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { useNow } from '@/hooks/useNow';
import { clockTime, dayLabel, humanDuration, num, signed } from '@/lib/format';
import { actionOf, lightOf, primaryCompetition } from '@/lib/status';
import { useGame } from '@/stores/game';
import { LightScope, useLight } from '@/theme/LightProvider';
import { springs, useMotionOK } from '@/theme/motion';

type RankView = 'live' | 'winners';

export default function RanksRoute() {
  const params = useLocalSearchParams<{ c?: string; view?: string }>();
  const day = useGame((s) => s.day);
  const now = useNow(1000);
  const view: RankView = params.view === 'winners' ? 'winners' : 'live';
  if (!day) return <Page>{null}</Page>;
  const id = params.c && parseCompetitionId(params.c) ? params.c : primaryCompetition(day, now).id;
  return <Ranks id={id} view={view} todayKey={day.dayKey} />;
}

function Ranks({ id, view, todayKey }: { id: string; view: RankView; todayKey: string }) {
  const backend = useBackend();
  const now = useNow(1000);
  const [competition, setCompetition] = useState<Competition | null>(null);
  useEffect(() => {
    let alive = true;
    const load = () => backend.getCompetition(id).then((c) => alive && setCompetition(c));
    void load();
    const t = setInterval(load, 3000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [backend, id]);
  if (!competition) return <Page>{null}</Page>;
  return (
    <LightScope name={lightOf(competition, now)}>
      <Board competition={competition} view={view} todayKey={todayKey} />
    </LightScope>
  );
}

function Board({ competition: c, view, todayKey }: { competition: Competition; view: RankView; todayKey: string }) {
  const now = useNow(1000);
  const day = useGame((s) => s.day);
  const board = useLeaderboard(view === 'live' ? c.id : null, 50);
  const parsed = parseCompetitionId(c.id)!;
  const phase = phaseOf(c, now);
  const s = SESSIONS[parsed.kind];
  const past = parsed.dayKey !== todayKey;
  const action = actionOf(c, now, day);
  const pick = (k: CompetitionKind) => router.setParams({ c: competitionId(todayKey, k) });

  const status =
    phase === 'upcoming'
      ? `Starts at ${clockTime(c.opensAt)}`
      : phase === 'open'
        ? c.kind === 'daily'
          ? `Live now · ends at midnight`
          : `Live now · ends at ${clockTime(c.closesAt)}`
        : phase === 'closing'
          ? `Winner in ${humanDuration(c.crownAt - now)}`
          : `Final · ${dayLabel(c.closesAt)}`;
  const rows = board?.rows ?? [];
  const showBar = view === 'live' && Boolean(board?.me && board.myRank);

  return (
    <Page bottomPad={showBar ? 120 : 48} overlay={showBar && board ? <MyRankBar board={board} /> : null}>
      <Head>
        <title>{view === 'winners' ? 'Winners — Glint!' : `Ranks: ${s.title} — Glint!`}</title>
      </Head>
      <Container style={{ gap: 16, maxWidth: 820 }}>
        <PopIn>
          <T v="xl" accessibilityRole="header">
            Ranks
          </T>
        </PopIn>
        <PopIn index={1}>
          <Segmented
            label="Show"
            stretch
            value={view}
            onChange={(v) => router.setParams({ view: v })}
            options={[
              { value: 'live', label: 'Scores' },
              { value: 'winners', label: 'Winners' },
            ]}
          />
        </PopIn>

        {view === 'winners' ? (
          <Winners />
        ) : (
          <>
            <PopIn index={2}>
              {past ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <Chip tone="solid" icon="clock">
                    {dayLabel(c.opensAt)}
                  </Chip>
                  <Button label="Back to today" size="s" variant="ink" iconLeft="arrow-left" onPress={() => router.setParams({ c: competitionId(todayKey, parsed.kind) })} />
                </View>
              ) : (
                <Segmented label="Game" scroll value={parsed.kind} onChange={pick} options={KINDS.map((k) => ({ value: k, label: SESSIONS[k].title }))} />
              )}
            </PopIn>

            <PopIn index={3}>
              <Card pad={14} contentStyle={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <SessionTile kind={parsed.kind} size={48} />
                <View style={{ flex: 1, gap: 2 }}>
                  <T v="s" fit={0.7}>
                    {s.title}
                  </T>
                  <T v="label" muted>
                    {status}
                  </T>
                </View>
                {board ? (
                  <Chip tone="solid" icon="you">
                    {num(board.total)}
                  </Chip>
                ) : null}
              </Card>
            </PopIn>

            {phase === 'upcoming' ? (
              <Card contentStyle={{ gap: 12 }}>
                <T v="title">{`${s.title} starts at ${clockTime(c.opensAt)}.`}</T>
                <Button label={action.kind === 'register' ? 'Save my spot' : 'Open the game'} href={`/competition/${c.id}`} />
              </Card>
            ) : board && rows.length === 0 ? (
              <Card contentStyle={{ gap: 12 }}>
                <T v="title">No one has played yet. Be the first!</T>
                {action.kind === 'play' ? <Button label="Play" iconLeft="play" idle="pulse" href={`/competition/${c.id}`} /> : null}
              </Card>
            ) : (
              <>
                <Podium key={c.id} rows={rows} />
                <TimingTower board={board} limit={50} offset={3} />
              </>
            )}
          </>
        )}
      </Container>
    </Page>
  );
}

/** Your own place, pinned just above the tab bar so you never have to hunt for it. */
function MyRankBar({ board }: { board: LeaderboardView }) {
  const light = useLight();
  const insets = useSafeAreaInsets();
  const tabBar = useTabBarSpace();
  const motion = useMotionOK();
  const y = useSharedValue(motion ? 90 : 0);
  useEffect(() => {
    if (motion) y.set(withSpring(0, springs.pop));
  }, [motion, y]);
  const rise = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  const me = board.me!;
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 16, right: 16, bottom: (tabBar || insets.bottom + 8) + 6, alignItems: 'center' }, rise]}>
      <View
        accessible
        accessibilityLabel={`You are number ${board.myRank} of ${board.total}, with ${me.score} points`}
        style={{
          width: '100%',
          maxWidth: 788,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingVertical: 10,
          paddingHorizontal: 14,
          borderRadius: 20,
          backgroundColor: light.sun,
          boxShadow: `0px 4px 0px 0px ${light.sunLip}, 0px 12px 24px -10px ${light.shadow}`,
        }}
      >
        <Avatar seed={me.avatarSeed} size={34} />
        <View style={{ flex: 1 }}>
          <T v="title" color={light.onSun} fit={0.7}>
            {`You are #${num(board.myRank ?? 0)}`}
          </T>
          <T v="label" color={light.onSun}>
            {`of ${num(board.total)} players`}
          </T>
        </View>
        <T v="m" color={light.onSun}>
          {signed(me.score)}
        </T>
      </View>
    </Animated.View>
  );
}
