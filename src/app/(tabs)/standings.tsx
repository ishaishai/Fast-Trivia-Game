import { router, useLocalSearchParams } from 'expo-router';
import Head from 'expo-router/head';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { KINDS, SESSIONS, addDays, competitionId, parseCompetitionId, phaseOf } from '@shared/schedule';
import type { Competition, CompetitionKind } from '@shared/types';
import { useBackend } from '@/backend/BackendProvider';
import { WordsReveal } from '@/components/motion/Kinetic';
import { Reveal, Section } from '@/components/motion/ScrollScene';
import { TimingTower } from '@/components/standings/TimingTower';
import { Button } from '@/components/ui/Button';
import { Container, Page } from '@/components/ui/Page';
import { Eyebrow, LiveDot } from '@/components/ui/bits';
import { T } from '@/components/ui/Text';
import { Segmented } from '@/components/ui/Toggle';
import { copy } from '@/copy/en';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { useNow } from '@/hooks/useNow';
import { clockTime, countdown, dayLabel, num, ordinal, signed } from '@/lib/format';
import { featured, lightOf } from '@/lib/status';
import { useGame } from '@/stores/game';
import { useLayout } from '@/theme/layout';
import { LightScope, useLight } from '@/theme/LightProvider';
import { FONTS } from '@/theme/typography';

export default function StandingsRoute() {
  const params = useLocalSearchParams<{ c?: string }>();
  const day = useGame((s) => s.day);
  const now = useNow(1000);
  if (!day) return <Page>{null}</Page>;
  const parsed = params.c ? parseCompetitionId(params.c) : null;
  const id = parsed ? params.c! : featured(day, now).id;
  return <Standings id={id} todayKey={day.dayKey} />;
}

function Standings({ id, todayKey }: { id: string; todayKey: string }) {
  const backend = useBackend();
  const now = useNow(1000);
  const parsed = parseCompetitionId(id)!;
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
      <Board competition={competition} kind={parsed.kind} dayKey={parsed.dayKey} todayKey={todayKey} />
    </LightScope>
  );
}

function Board({ competition: c, kind, dayKey, todayKey }: { competition: Competition; kind: CompetitionKind; dayKey: string; todayKey: string }) {
  const layout = useLayout();
  const light = useLight();
  const now = useNow(1000);
  const board = useLeaderboard(c.id, 50);
  const phase = phaseOf(c, now);
  const s = SESSIONS[kind];
  const wide = layout.isDesktop;
  const go = (k: CompetitionKind, d: string) => router.setParams({ c: competitionId(d, k) });
  const days = Array.from({ length: 7 }, (_, i) => addDays(todayKey, -i));
  const leader = board?.rows[0] ?? null;
  const me = board?.me ?? null;

  const status =
    phase === 'upcoming'
      ? `${copy.standings.upcoming} · Doors open ${clockTime(c.opensAt)} ${dayLabel(c.opensAt)}`
      : phase === 'open'
        ? `${copy.standings.live} · Closes in ${countdown(c.closesAt - now)}`
        : phase === 'closing'
          ? `${copy.standings.closing} · ${countdown(c.crownAt - now)}`
          : `${copy.standings.final} · ${dayLabel(c.closesAt)}`;

  return (
    <Page>
      <Head>
        <title>{`Standings: ${s.title} — Meridian`}</title>
      </Head>
      <Section>
        <Container style={{ gap: 26 }}>
          <Reveal>
            <Eyebrow>{copy.standings.eyebrow}</Eyebrow>
          </Reveal>
          <WordsReveal key={c.id} text={s.title} style={layout.type.hero} color={light.ink} />
          <Reveal delay={120}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              {phase === 'open' ? <LiveDot /> : null}
              <T v="label">{status}</T>
            </View>
          </Reveal>
          <Reveal delay={160}>
            <View style={{ gap: 12 }}>
              <Segmented
                label="Competition"
                value={kind}
                onChange={(k) => go(k, dayKey)}
                options={KINDS.map((k) => ({ value: k, label: SESSIONS[k].title }))}
              />
              <Segmented
                label="Day"
                value={dayKey}
                onChange={(d) => go(kind, d)}
                options={days.map((d, i) => ({ value: d, label: i === 0 ? 'Today' : i === 1 ? 'Yesterday' : dayLabel(new Date(`${d}T12:00:00`).getTime()) }))}
              />
            </View>
          </Reveal>
        </Container>
      </Section>
      <Section style={{ paddingTop: layout.isPhone ? 28 : 48 }}>
        <Container style={{ flexDirection: wide ? 'row' : 'column', gap: wide ? 64 : 28 }}>
          <View style={{ flex: wide ? 0.75 : undefined, gap: 24 }}>
            <Reveal>
              <View style={{ gap: 4 }}>
                <T v="label" muted>
                  {phase === 'final' ? 'Champion' : copy.standings.crownLine}
                </T>
                <T v="xl" style={{ fontFamily: FONTS.black }}>
                  {leader ? signed(leader.score) : '—'}
                </T>
                {leader ? (
                  <T v="title">
                    @{leader.handle}
                    {leader.city ? ` · ${leader.city}` : ''}
                  </T>
                ) : null}
              </View>
            </Reveal>
            <Reveal delay={80}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 28 }}>
                <Fact label={copy.standings.players} value={num(board?.total ?? 0)} />
                {phase === 'open' ? <Fact label={copy.standings.playingNow} value={num(board?.live ?? 0)} /> : null}
                {me && board?.myRank ? <Fact label={copy.standings.you} value={ordinal(board.myRank)} /> : null}
                {me && leader && me.uid !== leader.uid ? <Fact label={copy.standings.gap} value={String(leader.score - me.score)} /> : null}
              </View>
            </Reveal>
            {!me && phase !== 'upcoming' ? (
              <Reveal delay={120}>
                <View style={{ gap: 12 }}>
                  <T v="body" muted>
                    {copy.standings.notPlayed}
                  </T>
                  {phase === 'open' ? <Button label="Go to the lobby" variant="ink" href={`/competition/${c.id}`} /> : null}
                </View>
              </Reveal>
            ) : null}
            <Reveal delay={160}>
              <T v="bodyS" muted style={{ maxWidth: 420 }}>
                {copy.rules.tieBreak}
              </T>
            </Reveal>
          </View>
          <View style={{ flex: wide ? 1.4 : undefined }}>
            {phase === 'upcoming' ? (
              <T v="bodyL" muted>
                {`Doors open at ${clockTime(c.opensAt)}. ${c.registeredCount ? `${num(c.registeredCount)} registered so far.` : ''}`}
              </T>
            ) : board && board.rows.length === 0 ? (
              <T v="bodyL" muted>
                {copy.standings.empty}
              </T>
            ) : (
              <TimingTower board={board} limit={50} />
            )}
          </View>
        </Container>
      </Section>
    </Page>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ gap: 2 }}>
      <T v="label" muted>
        {label}
      </T>
      <T v="m" style={{ fontFamily: FONTS.extra }}>
        {value}
      </T>
    </View>
  );
}
