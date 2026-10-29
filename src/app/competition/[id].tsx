import { router, useLocalSearchParams } from 'expo-router';
import Head from 'expo-router/head';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, type GestureResponderEvent } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { isGameError } from '@shared/errors';
import { SESSIONS, localZone, parseCompetitionId } from '@shared/schedule';
import type { Competition } from '@shared/types';
import { play } from '@/audio/sound';
import { useBackend } from '@/backend/BackendProvider';
import { WordsReveal, Odometer } from '@/components/motion/Kinetic';
import { Reveal, Section } from '@/components/motion/ScrollScene';
import { playCurtain } from '@/components/nav/TransitionOverlay';
import { LightWindow } from '@/components/sky/LightWindow';
import { TimingTower } from '@/components/standings/TimingTower';
import { Button } from '@/components/ui/Button';
import { Container, Page } from '@/components/ui/Page';
import { Eyebrow, Hairline, LiveDot } from '@/components/ui/bits';
import { T } from '@/components/ui/Text';
import { toast } from '@/components/ui/Toasts';
import { copy, inSentence } from '@/copy/en';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { useNow } from '@/hooks/useNow';
import { clockTime, countdown, dayLabel, num, signed } from '@/lib/format';
import { lightOf, statusOf } from '@/lib/status';
import { useGame } from '@/stores/game';
import { useLayout } from '@/theme/layout';
import { LightScope, useLight } from '@/theme/LightProvider';
import { LIGHTS } from '@/theme/palette';
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

function Lobby({ competition: c }: { competition: Competition }) {
  const backend = useBackend();
  const day = useGame((s) => s.day);
  const now = useNow(1000);
  const layout = useLayout();
  const light = useLight();
  const board = useLeaderboard(c.id, 10);
  const [busy, setBusy] = useState(false);
  const s = SESSIONS[c.kind];
  const st = statusOf(c, now, day);
  const isDaily = c.kind === 'daily';
  const wide = layout.isDesktop;

  // The doors-open moment.
  const flash = useSharedValue(0);
  const previous = useRef(st.phase);
  useEffect(() => {
    if (previous.current === 'upcoming' && st.phase === 'open') {
      play('open');
      toast(`${s.title}: the doors are open.`);
      flash.value = withSequence(withTiming(1, { duration: 160 }), withTiming(0, { duration: 900 }));
    }
    previous.current = st.phase;
  }, [flash, s.title, st.phase]);
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value * 0.5 }));

  let target: number | null = null;
  let targetLabel = '';
  if (st.phase === 'upcoming') {
    if (st.reg === 'not-yet' && c.regOpensAt) {
      target = c.regOpensAt;
      targetLabel = 'Registration opens in';
    } else {
      target = c.opensAt;
      targetLabel = 'Doors open in';
    }
  } else if (st.phase === 'open') {
    target = c.closesAt;
    targetLabel = 'Doors close in';
  } else if (st.phase === 'closing') {
    target = c.crownAt;
    targetLabel = 'Crowned in';
  }

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

  const primary = st.running ? (
    <Button label="Back to your run" onPress={() => router.push(`/run/${c.id}`)} />
  ) : st.canEnter ? (
    <Button label={copy.day.enter(s.title)} onPress={enter} accessibilityHint="Starts your one run for this competition" />
  ) : st.mine ? (
    <Button label={`${copy.day.results}: ${signed(st.mine.score)}`} href={`/results/${c.id}`} />
  ) : st.canRegister ? (
    <Button label={`Register for ${s.title}`} loading={busy} onPress={() => act(() => backend.register(c.id), `Registered. Doors open at ${clockTime(c.opensAt)}.`)} />
  ) : st.canCancel ? (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
      <View style={{ height: 60, paddingHorizontal: 24, borderRadius: 999, backgroundColor: light.sun, justifyContent: 'center' }}>
        <T v="title" color={light.onSun}>
          {copy.day.registered}
        </T>
      </View>
      <Button
        label={copy.day.cancel}
        variant="ghost"
        icon={null}
        disabled={busy}
        onPress={() => act(() => backend.unregister(c.id), 'Registration cancelled.')}
      />
    </View>
  ) : st.missed ? (
    <T v="bodyL" muted>
      {copy.day.registrationClosed}
    </T>
  ) : st.reg === 'not-yet' ? (
    <T v="bodyL" muted>
      Registration opens 24 hours before the doors.
    </T>
  ) : null;

  const facts: [string, string][] = [];
  if (!isDaily && st.phase === 'upcoming') facts.push(['Registered', num(c.registeredCount)]);
  if (st.phase !== 'upcoming') facts.push([copy.standings.players, num(c.playersCount)]);
  if (st.phase === 'open') facts.push([copy.standings.playingNow, num(c.liveCount)]);
  if (c.champion) facts.push(['Champion', `@${c.champion.handle}`]);

  return (
    <Page nav>
      <Head>
        <title>{`${s.title} — Meridian`}</title>
      </Head>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: light.sun, zIndex: 5 }, flashStyle]} />
      <Section>
        <Container style={{ flexDirection: wide ? 'row' : 'column', gap: wide ? 64 : 32 }}>
          <View style={{ flex: wide ? 1.1 : undefined, gap: 22 }}>
            <Reveal delay={60}>
              <Eyebrow>{`${s.eyebrow} · ${dayLabel(c.opensAt)}`}</Eyebrow>
            </Reveal>
            <WordsReveal text={s.title} style={layout.type.hero} color={light.ink} delay={120} />
            <Reveal delay={240}>
              <View style={{ gap: 8 }}>
                <T v="bodyL" muted style={{ maxWidth: 560 }}>
                  {s.blurb}
                </T>
                <T v="label">
                  {isDaily ? 'Open 00:00 – 24:00, your time' : `${clockTime(c.opensAt)} – ${clockTime(c.closesAt)} · Registration required`}
                </T>
              </View>
            </Reveal>

            {target ? (
              <Reveal delay={320}>
                <View style={{ gap: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {st.phase === 'open' ? <LiveDot /> : null}
                    <T v="label" muted>
                      {targetLabel}
                    </T>
                  </View>
                  <Odometer
                    value={countdown(target - now)}
                    accessibilityLabel={`${targetLabel} ${countdown(target - now)}`}
                    style={{ fontFamily: FONTS.thin, fontSize: layout.isPhone ? 72 : 128, lineHeight: layout.isPhone ? 74 : 124, color: light.ink, letterSpacing: -2 }}
                  />
                </View>
              </Reveal>
            ) : null}

            <Reveal delay={380}>
              <View style={{ gap: 16 }}>{primary}</View>
            </Reveal>

            {facts.length ? (
              <Reveal delay={440}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 32, marginTop: 8 }}>
                  {facts.map(([label, value]) => (
                    <View key={label} style={{ gap: 2 }}>
                      <T v="label" muted>
                        {label}
                      </T>
                      <T v="m" style={{ fontFamily: FONTS.extra }}>
                        {value}
                      </T>
                    </View>
                  ))}
                </View>
              </Reveal>
            ) : null}

            <Reveal delay={500}>
              <View style={{ gap: 14, marginTop: 12 }}>
                <Hairline />
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 24 }}>
                  {[
                    ['60 s', 'of answering'],
                    ['3 s', 'a question'],
                    ['+3 / −1', 'right / wrong'],
                    [`${day?.skipsLeft ?? 24}`, 'skips left today'],
                  ].map(([n, label]) => (
                    <View key={label} style={{ gap: 2 }}>
                      <T v="s" style={{ fontFamily: FONTS.extra }}>
                        {n}
                      </T>
                      <T v="label" muted>
                        {label}
                      </T>
                    </View>
                  ))}
                </View>
              </View>
            </Reveal>
          </View>

          <View style={{ flex: wide ? 1 : undefined, gap: 28 }}>
            {!layout.isPhone ? (
              <Reveal delay={200}>
                <LightWindow
                  light={lightOf(c, now)}
                  minutes={isDaily ? localZone.minutesOf(now) : localZone.minutesOf(c.opensAt)}
                  label={`${isDaily ? 'Now' : clockTime(c.opensAt)} · ${LIGHTS[lightOf(c, now)].label}`}
                  width={wide ? Math.min(560, layout.width * 0.38) : layout.width - layout.gutter * 2}
                  height={wide ? 300 : 220}
                />
              </Reveal>
            ) : null}
            {st.phase !== 'upcoming' ? (
              <Reveal delay={300}>
                <View style={{ gap: 14 }}>
                  <T v="label" muted>
                    {st.phase === 'final' ? copy.standings.final : copy.standings.live} · {s.title}
                  </T>
                  {board && board.rows.length === 0 ? (
                    <T v="body" muted>
                      {copy.standings.empty}
                    </T>
                  ) : (
                    <TimingTower board={board} limit={10} />
                  )}
                  <Button label={copy.standings.full} variant="ink" href={`/standings?c=${c.id}`} />
                </View>
              </Reveal>
            ) : (
              <Reveal delay={300}>
                <T v="bodyL" muted style={{ maxWidth: 480 }}>
                  {`Everyone in ${inSentence(s.title)} gets the same 80 questions in the same order. Standings go live the moment the doors open.`}
                </T>
              </Reveal>
            )}
          </View>
        </Container>
      </Section>
    </Page>
  );
}
