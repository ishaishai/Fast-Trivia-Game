import { router, useIsFocused, useLocalSearchParams } from 'expo-router';
import Head from 'expo-router/head';
import { useEffect, useRef, useState } from 'react';
import { View, type GestureResponderEvent } from 'react-native';
import { isGameError } from '@shared/errors';
import { SESSIONS, parseCompetitionId } from '@shared/schedule';
import type { Competition } from '@shared/types';
import { play } from '@/audio/sound';
import { useBackend } from '@/backend/BackendProvider';
import { Sunny } from '@/components/brand/Sunny';
import { Confetti } from '@/components/fx/Confetti';
import { Odometer } from '@/components/motion/Kinetic';
import { Float, PopIn, useAmbientClock } from '@/components/motion/Playful';
import { playCurtain } from '@/components/nav/TransitionOverlay';
import { WorldDecor } from '@/components/sky/World';
import { Podium } from '@/components/standings/Podium';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Gradient } from '@/components/ui/Gradient';
import { Container, Page } from '@/components/ui/Page';
import { Chip, LiveDot } from '@/components/ui/bits';
import { T } from '@/components/ui/Text';
import { toast } from '@/components/ui/Toasts';
import { copy } from '@/copy/en';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { useNow } from '@/hooks/useNow';
import { clockTime, countdown, dayLabel, signed } from '@/lib/format';
import { actionOf, countdownTarget, lightOf, statusOf } from '@/lib/status';
import { statusLine } from '@/lib/statusLine';
import { useGame } from '@/stores/game';
import { useLayout } from '@/theme/layout';
import { LightScope, useLight } from '@/theme/LightProvider';
import { CARD } from '@/theme/palette';
import { radius } from '@/theme/shape';
import { FONTS } from '@/theme/typography';

export default function CompetitionRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const backend = useBackend();
  const now = useNow(1000);
  const [competition, setCompetition] = useState<Competition | null>(null);
  const day = useGame((s) => s.day);
  const valid = id ? parseCompetitionId(id) : null;

  useEffect(() => {
    if (!id || !valid) return;
    let alive = true;
    const load = () => backend.getCompetition(id).then((c) => alive && setCompetition(c));
    void load();
    const timer = setInterval(load, 2000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [backend, id, valid]);

  // Prefer the live copy from today's view when there is one.
  const live = day?.competitions.find((c) => c.id === id) ?? day?.tomorrow.find((c) => c.id === id) ?? competition;
  if (!valid) {
    return (
      <Page nav>
        <Container style={{ gap: 18 }}>
          <T v="xl">{copy.notFound.title}</T>
          <Button label={copy.notFound.cta} href="/" />
        </Container>
      </Page>
    );
  }
  if (!live) return <Page nav>{null}</Page>;
  return (
    <LightScope name={lightOf(live, now)}>
      <Lobby competition={live} />
    </LightScope>
  );
}

const TO: Record<'signup' | 'start' | 'end' | 'winner', string> = {
  signup: 'Sign-up opens in',
  start: 'Starts in',
  end: 'Ends in',
  winner: 'Winner in',
};

function Lobby({ competition: c }: { competition: Competition }) {
  const backend = useBackend();
  const day = useGame((s) => s.day);
  const now = useNow(1000);
  const layout = useLayout();
  const light = useLight();
  const board = useLeaderboard(c.id, 3);
  const [busy, setBusy] = useState(false);
  const s = SESSIONS[c.kind];
  const st = statusOf(c, now, day);
  const action = actionOf(c, now, day);
  const target = countdownTarget(c, st);
  const isDaily = c.kind === 'daily';
  const tomorrow = Boolean(day && c.dayKey !== day.dayKey);

  // The doors-open moment: a chime and a shower of confetti.
  const [cheer, setCheer] = useState(0);
  const previous = useRef(st.phase);
  useEffect(() => {
    if (previous.current === 'upcoming' && st.phase === 'open') {
      play('open');
      toast(`${s.title} is open. Go!`);
      setCheer((n) => n + 1);
    }
    previous.current = st.phase;
  }, [s.title, st.phase]);

  const act = async (fn: () => Promise<void>, done: string) => {
    setBusy(true);
    try {
      await fn();
      toast(done);
    } catch (e) {
      toast(isGameError(e) ? e.message : 'Couldn’t reach the server. Try again.', 'error');
    } finally {
      setBusy(false);
    }
  };
  const enter = (e: GestureResponderEvent) => playCurtain(e, light.sun, () => router.push(`/run/${c.id}`));

  const primary =
    action.kind === 'resume' ? (
      <Button label={copy.play.keepPlaying} size="xl" iconLeft="play" stretch idle="pulse" onPress={() => router.push(`/run/${c.id}`)} />
    ) : action.kind === 'play' ? (
      <Button label={copy.play.play} size="xl" iconLeft="play" stretch idle="pulse" onPress={enter} accessibilityHint="Starts your one game" />
    ) : action.kind === 'done' ? (
      <Button label={`${copy.play.myScore}: ${signed(action.score)}`} size="l" stretch href={`/results/${c.id}`} />
    ) : action.kind === 'register' ? (
      <Button
        label={copy.play.saveSpot}
        size="xl"
        stretch
        idle="pulse"
        loading={busy}
        onPress={() => act(() => backend.register(c.id), `You’re in! ${s.title} starts at ${clockTime(c.opensAt)}${tomorrow ? ' tomorrow' : ''}.`)}
      />
    ) : action.kind === 'registered' ? (
      <View style={{ gap: 10, alignItems: 'center' }}>
        <Chip tone="good" icon="check" style={{ alignSelf: 'center', height: 40, paddingHorizontal: 18 }}>
          {copy.play.youreIn}
        </Chip>
        <Button label="Cancel my spot" size="s" variant="ghost" disabled={busy} onPress={() => act(() => backend.unregister(c.id), 'Your spot is cancelled.')} />
      </View>
    ) : action.kind === 'missed' || action.kind === 'closing' || action.kind === 'final' ? (
      <Button label={copy.play.ranks} variant="ink" size="l" iconLeft="trophy" stretch href={`/standings?c=${c.id}`} />
    ) : null;

  const rows = board?.rows ?? [];
  return (
    <Page nav overlay={<Confetti fire={cheer} />}>
      <Head>
        <title>{`${s.title} — Meridian`}</title>
      </Head>
      <Container style={{ gap: 16, maxWidth: 640 }}>
        <PopIn from={0.85}>
          <Card pad={0} radius={radius.xl}>
            <Banner mood={action.kind === 'missed' ? 'worried' : st.phase === 'final' ? 'sleepy' : 'happy'} />
            <View style={{ padding: 22, gap: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <T v="l" fit={0.7} style={{ flex: 1 }} accessibilityRole="header">
                  {s.title}
                </T>
                <Chip tone="solid" dot={st.phase === 'open'}>
                  {tomorrow ? 'Tomorrow' : copy.sessions[c.kind].tag}
                </Chip>
              </View>
              <T v="body" muted>
                {s.blurb}
              </T>
              <T v="label">
                {isDaily ? `Open all day · ${dayLabel(c.opensAt)}` : `${dayLabel(c.opensAt)} · ${clockTime(c.opensAt)} – ${clockTime(c.closesAt)} · sign up first`}
              </T>
              {target ? (
                <View style={{ backgroundColor: CARD.deep, borderRadius: 20, padding: 14, alignItems: 'center', gap: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {st.phase === 'open' ? <LiveDot size={7} /> : null}
                    <T v="label" muted>
                      {TO[target.to]}
                    </T>
                  </View>
                  <Odometer
                    value={countdown(target.at - now)}
                    accessibilityLabel={`${TO[target.to]} ${countdown(target.at - now)}`}
                    style={{ fontFamily: FONTS.num, fontSize: layout.isPhone ? 44 : 56, lineHeight: layout.isPhone ? 52 : 66, color: CARD.ink }}
                  />
                </View>
              ) : (
                <T v="title">{statusLine(action, c, now)}</T>
              )}
              {action.kind === 'missed' ? <T v="body" muted>{copy.status.missed}</T> : null}
              {primary}
            </View>
          </Card>
        </PopIn>

        {st.phase !== 'upcoming' && rows.length ? (
          <PopIn index={1}>
            <View style={{ gap: 10 }}>
              <T v="s" accessibilityRole="header">
                {st.phase === 'final' ? 'Winners' : 'Top players right now'}
              </T>
              <Podium rows={rows} compact />
              <Button label="See all ranks" variant="ink" stretch iconLeft="trophy" href={`/standings?c=${c.id}`} />
            </View>
          </PopIn>
        ) : null}
      </Container>
    </Page>
  );
}

function Banner({ mood }: { mood: 'happy' | 'worried' | 'sleepy' }) {
  const light = useLight();
  const focused = useIsFocused();
  const t = useAmbientClock(24000, focused);
  return (
    <Gradient
      colors={light.sky}
      style={{ height: 140, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}
    >
      <WorldDecor kind={light.decor} t={t} dark={light.statusBar === 'light'} height={140} />
      <Float amplitude={6}>
        <Sunny size={116} mood={mood} />
      </Float>
    </Gradient>
  );
}
