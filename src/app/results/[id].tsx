import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams } from 'expo-router';
import Head from 'expo-router/head';
import { useEffect, useState } from 'react';
import { Platform, Share, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring } from 'react-native-reanimated';
import { CATEGORIES } from '@shared/questions/categories';
import { SESSIONS, parseCompetitionId, phaseOf } from '@shared/schedule';
import type { Competition, ReviewItem, RunSummary } from '@shared/types';
import { haptic } from '@/audio/haptics';
import { play } from '@/audio/sound';
import { useBackend } from '@/backend/BackendProvider';
import { Icon } from '@/components/icons';
import { useCountUp } from '@/components/motion/Kinetic';
import { Reveal, Section } from '@/components/motion/ScrollScene';
import { Button } from '@/components/ui/Button';
import { Container, Page } from '@/components/ui/Page';
import { Eyebrow, Hairline } from '@/components/ui/bits';
import { T } from '@/components/ui/Text';
import { toast } from '@/components/ui/Toasts';
import { copy } from '@/copy/en';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { useNow } from '@/hooks/useNow';
import { dayLabel, num, ordinal, percent, seconds, signed } from '@/lib/format';
import { usePracticeResult } from '@/stores/practice';
import { useLayout } from '@/theme/layout';
import { LightScope, useLight } from '@/theme/LightProvider';
import { SIGNAL } from '@/theme/palette';
import { FONTS } from '@/theme/typography';

export default function ResultsRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <LightScope name="midnight">
      <Results id={id ?? ''} />
    </LightScope>
  );
}

function Results({ id }: { id: string }) {
  const backend = useBackend();
  const practice = id === 'practice';
  const practiceSummary = usePracticeResult((s) => s.summary);
  const [fetched, setFetched] = useState<{ id: string; summary: RunSummary | null } | null>(null);
  const summary: RunSummary | null | undefined = practice ? practiceSummary : fetched?.id === id ? fetched.summary : undefined;
  const layout = useLayout();
  const light = useLight();
  const now = useNow(5000);
  const parsed = practice ? null : parseCompetitionId(id);
  const board = useLeaderboard(practice ? null : id, 1);
  const [competition, setCompetition] = useState<Competition | null>(null);
  useEffect(() => {
    if (!practice && id) void backend.getCompetition(id).then(setCompetition);
  }, [backend, id, practice]);

  useEffect(() => {
    if (practice) return;
    let alive = true;
    void backend.getResult(id).then((s) => alive && setFetched({ id, summary: s }));
    return () => {
      alive = false;
    };
  }, [backend, id, practice]);

  if (summary === undefined) return <Page nav>{null}</Page>;
  if (summary === null) {
    return (
      <Page nav>
        <Container style={{ gap: 20 }}>
          <T v="xl">{copy.results.notFound}</T>
          <Button label={copy.results.today} href="/" />
        </Container>
      </Page>
    );
  }

  const title = practice ? copy.run.practice : parsed ? SESSIONS[parsed.kind].title : '';
  const t = summary.totals;
  const rank = board?.myRank ?? null;
  const total = board?.total ?? 0;
  const leader = board?.rows[0] ?? null;
  const crowned = rank === 1;
  const final = competition ? phaseOf(competition, now) === 'final' : false;

  return (
    <Page nav>
      <Head>
        <title>{`Your run: ${signed(t.score)} — Meridian`}</title>
      </Head>
      <Section>
        <Container style={{ gap: layout.isPhone ? 28 : 40 }}>
          <Reveal>
            <Eyebrow>{`${copy.results.eyebrow} · ${title}${practice ? '' : ` · ${dayLabel(summary.finishedAt)}`}`}</Eyebrow>
          </Reveal>
          <View style={{ flexDirection: layout.isDesktop ? 'row' : 'column', gap: layout.isDesktop ? 64 : 28, alignItems: layout.isDesktop ? 'flex-end' : 'stretch' }}>
            <ScoreBlock score={t.score} />
            <View style={{ flex: 1, gap: 12, paddingBottom: layout.isDesktop ? 28 : 0 }}>
              {practice ? (
                <T v="l">{copy.results.practiceDone}</T>
              ) : rank ? (
                <RankLine rank={rank} total={total} crowned={crowned} final={final} gap={leader && !crowned ? leader.score - t.score : 0} />
              ) : null}
            </View>
          </View>

          <Reveal delay={200}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              {practice ? (
                <>
                  <Button label={copy.results.again} href="/run/practice" icon="play" />
                  <Button label={copy.results.today} variant="ink" href="/" icon={null} />
                </>
              ) : (
                <>
                  <Button label={copy.results.share} icon="share" onPress={() => void share(summary, title, rank, total)} />
                  <Button label={copy.results.standings} variant="ink" href={`/standings?c=${id}`} />
                  <Button label={copy.results.today} variant="ghost" href="/" icon={null} />
                </>
              )}
            </View>
          </Reveal>

          <Hairline />

          <View style={{ flexDirection: layout.isDesktop ? 'row' : 'column', gap: layout.isDesktop ? 64 : 36 }}>
            <View style={{ flex: layout.isDesktop ? 0.9 : undefined, gap: 18 }}>
              <T v="label" muted>
                {copy.results.breakdown}
              </T>
              <Ledger summary={summary} />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 28, marginTop: 12 }}>
                <Fact label="Answered" value={num(t.answered)} />
                <Fact label="Accuracy" value={percent(t.correct, t.answered)} />
                <Fact label="Average answer" value={t.answered ? seconds(summary.avgMs) : '—'} />
                <Fact label="Best streak" value={num(t.bestStreak)} />
              </View>
            </View>
            <View style={{ flex: layout.isDesktop ? 1.2 : undefined, gap: 14 }}>
              <T v="label" muted>
                {copy.results.review}
              </T>
              {summary.review.map((item) => (
                <ReviewRow key={item.seq} item={item} />
              ))}
            </View>
          </View>
        </Container>
      </Section>
      <View style={{ height: 40, backgroundColor: light.field }} />
    </Page>
  );
}

function ScoreBlock({ score }: { score: number }) {
  const layout = useLayout();
  const light = useLight();
  const shown = useCountUp(score, { duration: 1300, delay: 150 });
  return (
    <View accessible accessibilityLabel={`${score} points`}>
      <T v="hero" style={{ fontSize: (layout.type.hero.fontSize as number) * 1.05, lineHeight: (layout.type.hero.fontSize as number) * 0.92 }}>
        {signed(shown)}
      </T>
      <T v="l" color={light.muted} style={{ fontFamily: FONTS.light }}>
        points
      </T>
    </View>
  );
}

function RankLine({ rank, total, crowned, final, gap }: { rank: number; total: number; crowned: boolean; final: boolean; gap: number }) {
  const layout = useLayout();
  const light = useLight();
  const shown = useCountUp(rank, { from: Math.max(rank, total), duration: 1500, delay: 500 });
  const burst = useSharedValue(0);
  useEffect(() => {
    if (!crowned) return;
    const t = setTimeout(() => {
      play('crown');
      haptic('success');
    }, 1900);
    burst.value = withDelay(1900, withSpring(1, { damping: 10, stiffness: 120 }));
    return () => clearTimeout(t);
  }, [burst, crowned]);
  const crownStyle = useAnimatedStyle(() => ({ opacity: burst.value, transform: [{ scale: 0.4 + burst.value * 0.6 }, { rotate: `${(1 - burst.value) * -20}deg` }] }));
  return (
    <View style={{ gap: 10 }}>
      {crowned ? (
        <Animated.View style={[{ flexDirection: 'row', alignItems: 'center', gap: 12 }, crownStyle]}>
          <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: light.sun, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="crown" color={light.onSun} size={30} strokeWidth={2.2} />
          </View>
          <T v="s">{final ? copy.results.crownFinal : copy.results.crown}</T>
        </Animated.View>
      ) : null}
      <T v="xl" style={{ fontSize: (layout.type.xl.fontSize as number) * 0.9 }} accessibilityLabel={`${ordinal(rank)} of ${num(total)}`}>
        {copy.results.rank(`#${num(shown)}`, num(total))}
      </T>
      <T v="bodyL" muted>
        {crowned ? (final ? 'The crown is yours for the day.' : copy.results.provisional) : `${copy.results.gap(gap)} ${final ? copy.results.final : copy.results.provisional}`}
      </T>
    </View>
  );
}

function Ledger({ summary }: { summary: RunSummary }) {
  const light = useLight();
  const t = summary.totals;
  const rows: { count: number; unit: string; per: string; value: number; tone?: string }[] = [
    { count: t.correct, unit: copy.results.right, per: '+3', value: t.correct * 3, tone: SIGNAL.correct },
    { count: t.wrong, unit: copy.results.wrong, per: '−1', value: -t.wrong, tone: SIGNAL.wrong },
    { count: t.silent, unit: copy.results.silent, per: '−1', value: -t.silent, tone: SIGNAL.wrong },
    { count: t.skips, unit: copy.results.skips, per: '0', value: 0 },
  ];
  return (
    <View accessibilityLabel={`${t.correct} right, ${t.wrong} wrong, ${t.silent} silent, ${t.skips} skips. Total ${t.score}.`} accessible>
      {rows.map((r) => (
        <View key={r.unit} style={{ flexDirection: 'row', alignItems: 'baseline', gap: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: light.line }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: r.tone ?? light.muted, alignSelf: 'center' }} />
          <T v="m" style={{ fontFamily: FONTS.extra, width: 56, fontVariant: ['tabular-nums'] }}>
            {r.count}
          </T>
          <T v="body" muted style={{ flex: 1 }}>
            {r.unit} × {r.per}
          </T>
          <T v="m" style={{ fontFamily: FONTS.extra, fontVariant: ['tabular-nums'] }}>
            {r.value === 0 ? '0' : signed(r.value)}
          </T>
        </View>
      ))}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 14 }}>
        <T v="label" muted>
          Total
        </T>
        <T v="l" style={{ fontFamily: FONTS.black }}>
          {signed(t.score)}
        </T>
      </View>
    </View>
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

function ReviewRow({ item }: { item: ReviewItem }) {
  const light = useLight();
  const outcome = item.outcome;
  const mark =
    outcome === 'correct'
      ? { bg: SIGNAL.correct, fg: SIGNAL.onCorrect, icon: 'check' as const, label: 'Right' }
      : outcome === 'wrong'
        ? { bg: SIGNAL.wrong, fg: SIGNAL.onWrong, icon: 'cross' as const, label: 'Wrong' }
        : outcome === 'silent'
          ? { bg: light.raised, fg: light.ink, icon: 'clock' as const, label: copy.run.eclipsed }
          : outcome === 'skipped'
            ? { bg: light.raised, fg: light.ink, icon: 'skip' as const, label: copy.run.skipped }
            : { bg: light.raised, fg: light.muted, icon: 'clock' as const, label: 'Not scored' };
  const yours = item.choice !== null ? item.options[item.choice] : null;
  const right = item.options[item.correctIndex];
  return (
    <View
      style={{ flexDirection: 'row', gap: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: light.line }}
      accessible
      accessibilityLabel={`Question ${item.seq + 1}: ${item.text}. ${mark.label}.${yours ? ` You said ${yours}.` : ''} Answer: ${right}.`}
    >
      <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: mark.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={mark.icon} color={mark.fg} size={16} strokeWidth={2.4} />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <T v="label" muted style={{ fontSize: 10 }}>
          Q{item.seq + 1} · {CATEGORIES[item.category].label} · {outcome === 'skipped' || outcome === 'sunset' ? mark.label : seconds(item.ms)}
        </T>
        <T v="title" style={{ fontSize: 16 }}>
          {item.text}
        </T>
        <T v="bodyS" muted>
          {outcome === 'correct' ? right : outcome === 'skipped' ? `Answer: ${right}` : yours ? `You: ${yours} · Answer: ${right}` : `Answer: ${right}`}
        </T>
      </View>
    </View>
  );
}

async function share(summary: RunSummary, title: string, rank: number | null, total: number) {
  const squares = summary.review
    .filter((r) => r.outcome !== 'sunset')
    .map((r) => (r.outcome === 'correct' ? '🟩' : r.outcome === 'wrong' ? '🟥' : r.outcome === 'silent' ? '⬛' : '⬜'))
    .join('');
  const lines = [
    `MERIDIAN · ${title} · ${dayLabel(summary.finishedAt)}`,
    `${signed(summary.totals.score)} points${rank ? ` · #${num(rank)} of ${num(total)}` : ''}`,
    squares,
  ];
  const site = process.env.EXPO_PUBLIC_SITE_URL;
  if (site) lines.push(site);
  const text = lines.join('\n');
  try {
    if (Platform.OS !== 'web') {
      await Share.share({ message: text });
      return;
    }
    const nav = typeof navigator !== 'undefined' ? (navigator as Navigator & { share?: (d: { text: string }) => Promise<void> }) : null;
    if (nav?.share && /Mobi|Android/i.test(nav.userAgent)) {
      await nav.share({ text });
      return;
    }
    await Clipboard.setStringAsync(text);
    toast(copy.results.copied);
  } catch {
    // Dismissing the share sheet is not an error.
  }
}
