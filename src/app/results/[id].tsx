import * as Clipboard from 'expo-clipboard';
import { useIsFocused, useLocalSearchParams } from 'expo-router';
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
import { Sunny, type Mood } from '@/components/brand/Sunny';
import { Confetti } from '@/components/fx/Confetti';
import { Icon, type IconName } from '@/components/icons';
import { useCountUp } from '@/components/motion/Kinetic';
import { Float, PopIn, useAmbientClock } from '@/components/motion/Playful';
import { WorldDecor } from '@/components/sky/World';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Disclosure } from '@/components/ui/Disclosure';
import { Gradient } from '@/components/ui/Gradient';
import { Container, Page } from '@/components/ui/Page';
import { T } from '@/components/ui/Text';
import { toast } from '@/components/ui/Toasts';
import { copy } from '@/copy/en';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { useNow } from '@/hooks/useNow';
import { dayLabel, num, ordinal, seconds, signed } from '@/lib/format';
import { usePracticeResult } from '@/stores/practice';
import { useLayout } from '@/theme/layout';
import { LightScope, useLight } from '@/theme/LightProvider';
import { CARD, SIGNAL } from '@/theme/palette';
import { radius } from '@/theme/shape';

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
  const mood: Mood = crowned ? 'proud' : t.score > 0 ? 'happy' : t.score === 0 ? 'wow' : 'worried';
  const wide = layout.width >= 900;

  return (
    <Page nav overlay={<Celebration score={t.score} crowned={crowned} />}>
      <Head>
        <title>{`Your score: ${signed(t.score)} — Meridian`}</title>
      </Head>
      <Container style={{ gap: 16, maxWidth: 1040 }}>
        <View style={{ flexDirection: wide ? 'row' : 'column', gap: 16, alignItems: 'flex-start' }}>
          <View style={{ flex: wide ? 1 : undefined, alignSelf: 'stretch', gap: 16 }}>
            <PopIn from={0.8}>
              <ScoreCard score={t.score} mood={mood} title={title} date={practice ? null : dayLabel(summary.finishedAt)} summary={summary} />
            </PopIn>
          </View>
          <View style={{ flex: wide ? 1 : undefined, alignSelf: 'stretch', gap: 16 }}>
            {practice ? (
              <PopIn index={1}>
                <Card contentStyle={{ gap: 8 }}>
                  <T v="s">{copy.results.practiceDone}</T>
                  <T v="body" muted>
                    Practice as much as you like. The real games are on the Play screen.
                  </T>
                </Card>
              </PopIn>
            ) : rank ? (
              <PopIn index={1}>
                <RankCard rank={rank} total={total} crowned={crowned} final={final} gap={leader && !crowned ? leader.score - t.score : 0} />
              </PopIn>
            ) : null}
            <PopIn index={2}>
              <View style={{ gap: 12 }}>
                {practice ? (
                  <>
                    <Button label={copy.results.again} size="l" href="/run/practice" iconLeft="play" stretch idle="pulse" />
                    <Button label={copy.results.today} variant="ink" href="/" stretch />
                  </>
                ) : (
                  <>
                    <Button label={copy.results.share} size="l" iconLeft="share" stretch onPress={() => void share(summary, title, rank, total)} />
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      <View style={{ flex: 1 }}>
                        <Button label={copy.play.ranks} variant="ink" iconLeft="trophy" stretch href={`/standings?c=${id}`} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Button label="Home" variant="ink" iconLeft="play" stretch href="/" />
                      </View>
                    </View>
                  </>
                )}
              </View>
            </PopIn>
            <PopIn index={3}>
              <Disclosure title={`See every question (${summary.review.filter((r) => r.outcome !== 'sunset').length})`}>
                <Card pad={8} contentStyle={{ gap: 2 }}>
                  {summary.review.map((item) => (
                    <ReviewRow key={item.seq} item={item} />
                  ))}
                </Card>
              </Disclosure>
            </PopIn>
          </View>
        </View>
      </Container>
    </Page>
  );
}

/** Confetti once the score has counted up (a bigger shower for a crown). */
function Celebration({ score, crowned }: { score: number; crowned: boolean }) {
  const [fire, setFire] = useState(0);
  useEffect(() => {
    if (score <= 0 && !crowned) return;
    const timer = setTimeout(() => setFire(1), crowned ? 1900 : 1450);
    return () => clearTimeout(timer);
  }, [crowned, score]);
  return <Confetti fire={fire} count={crowned ? 36 : 24} />;
}

function ScoreCard({ score, mood, title, date, summary }: { score: number; mood: Mood; title: string; date: string | null; summary: RunSummary }) {
  const light = useLight();
  const layout = useLayout();
  const focused = useIsFocused();
  const t = useAmbientClock(24000, focused);
  const shown = useCountUp(score, { duration: 1300, delay: 150 });
  const totals = summary.totals;
  const tally: { icon: IconName; count: number; label: string; bg: string; fg: string }[] = [
    { icon: 'check', count: totals.correct, label: 'right', bg: SIGNAL.correct, fg: SIGNAL.onCorrect },
    { icon: 'cross', count: totals.wrong, label: 'wrong', bg: SIGNAL.wrong, fg: SIGNAL.onWrong },
    { icon: 'clock', count: totals.silent, label: 'too slow', bg: '#FFE1C2', fg: '#7A2E00' },
    { icon: 'skip', count: totals.skips, label: 'skipped', bg: CARD.deep, fg: CARD.ink },
  ];
  const big = layout.isPhone ? 84 : 112;
  return (
    <Card pad={0} radius={radius.xl} accessibilityLabel={`${score} points`}>
      <Gradient colors={light.sky} style={{ height: 150, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
        <WorldDecor kind={light.decor} t={t} dark height={150} />
        <Float amplitude={6}>
          <Sunny size={128} mood={mood} />
        </Float>
      </Gradient>
      <View style={{ padding: 22, gap: 14, alignItems: 'center' }}>
        <T v="label" muted align="center">
          {date ? `${title} · ${date}` : title}
        </T>
        <View accessible accessibilityLabel={`${score} points`} style={{ alignItems: 'center' }}>
          <T v="hero" color={score < 0 ? SIGNAL.wrongLip : CARD.ink} style={{ fontSize: big, lineHeight: big * 1.08 }}>
            {signed(shown)}
          </T>
          <T v="s" muted>
            points
          </T>
        </View>
        <View
          style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}
          accessible
          accessibilityLabel={`${totals.correct} right, ${totals.wrong} wrong, ${totals.silent} too slow, ${totals.skips} skipped`}
        >
          {tally.map((x, i) => (
            <PopIn key={x.label} index={i} delay={900} from={0.5}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 12, borderRadius: 18, backgroundColor: x.bg }}>
                <Icon name={x.icon} color={x.fg} size={16} strokeWidth={3} />
                <T v="label" color={x.fg} style={{ fontSize: 15 }}>
                  {`${x.count} ${x.label}`}
                </T>
              </View>
            </PopIn>
          ))}
        </View>
        {totals.answered ? (
          <T v="bodyS" muted align="center">
            {`Best streak ${num(totals.bestStreak)} · average answer ${seconds(summary.avgMs)}`}
          </T>
        ) : null}
      </View>
    </Card>
  );
}

function RankCard({ rank, total, crowned, final, gap }: { rank: number; total: number; crowned: boolean; final: boolean; gap: number }) {
  const light = useLight();
  const shown = useCountUp(rank, { from: Math.max(rank, total), duration: 1500, delay: 500 });
  const burst = useSharedValue(0);
  useEffect(() => {
    if (!crowned) return;
    const t = setTimeout(() => {
      play('crown');
      haptic('success');
    }, 1900);
    burst.set(withDelay(1900, withSpring(1, { damping: 9, stiffness: 160 })));
    return () => clearTimeout(t);
  }, [burst, crowned]);
  const crownStyle = useAnimatedStyle(() => ({ opacity: Math.min(1, burst.value * 1.5), transform: [{ scale: 0.3 + burst.value * 0.7 }, { rotate: `${(1 - burst.value) * -25}deg` }] }));
  return (
    <Card tone={crowned ? 'sun' : 'white'} contentStyle={{ gap: 10 }}>
      {crowned ? (
        <Animated.View style={[{ flexDirection: 'row', alignItems: 'center', gap: 12 }, crownStyle]}>
          <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="crown" color="#E09A00" size={32} strokeWidth={2.4} filled />
          </View>
          <T v="m" color={light.onSun} style={{ flex: 1 }}>
            {final ? 'You won! The crown is yours.' : 'You’re on top!'}
          </T>
        </Animated.View>
      ) : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }} accessible accessibilityLabel={`${ordinal(rank)} of ${num(total)}`}>
        {!crowned ? (
          <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: CARD.deep, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="trophy" color={CARD.ink} size={28} strokeWidth={2.2} filled />
          </View>
        ) : null}
        <View style={{ flex: 1 }}>
          <T v="l" color={crowned ? light.onSun : CARD.ink} fit={0.6}>
            {`You’re #${num(shown)}`}
          </T>
          <T v="label" color={crowned ? light.onSun : CARD.muted}>
            {`of ${num(total)} players`}
          </T>
        </View>
      </View>
      <T v="body" color={crowned ? light.onSun : CARD.muted}>
        {crowned ? (final ? 'Nobody beat your score today.' : 'Others can still play, so hold on tight!') : `${copy.results.gap(gap)} ${final ? copy.results.final : 'Others are still playing.'}`}
      </T>
    </Card>
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
          ? { bg: '#FFE1C2', fg: '#7A2E00', icon: 'clock' as const, label: 'Too slow' }
          : outcome === 'skipped'
            ? { bg: light.deep, fg: light.ink, icon: 'skip' as const, label: copy.run.skipped }
            : { bg: light.deep, fg: light.muted, icon: 'clock' as const, label: 'Not scored' };
  const yours = item.choice !== null ? item.options[item.choice] : null;
  const right = item.options[item.correctIndex];
  return (
    <View
      style={{ flexDirection: 'row', gap: 12, padding: 10, borderRadius: 16 }}
      accessible
      accessibilityLabel={`Question ${item.seq + 1}: ${item.text}. ${mark.label}.${yours ? ` You said ${yours}.` : ''} Answer: ${right}.`}
    >
      <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: mark.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={mark.icon} color={mark.fg} size={18} strokeWidth={3} />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <T v="label" muted style={{ fontSize: 12 }}>
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
    `Meridian · ${title} · ${dayLabel(summary.finishedAt)}`,
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
