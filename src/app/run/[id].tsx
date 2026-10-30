import { Redirect, router, useLocalSearchParams } from 'expo-router';
import Head from 'expo-router/head';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import { Platform, ScrollView, View } from 'react-native';
import { useAnimatedReaction } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';
import { RULES } from '@shared/rules';
import { SESSIONS, parseCompetitionId, phaseOf } from '@shared/schedule';
import type { Competition, RunSummary } from '@shared/types';
import { useBackend } from '@/backend/BackendProvider';
import { Sunny, type Mood } from '@/components/brand/Sunny';
import { BurstHost, type BurstHandle } from '@/components/fx/PixelBurst';
import { Icon, type IconName } from '@/components/icons';
import { PopIn } from '@/components/motion/Playful';
import { IntroCountdown, RunClock, RunScore, RunTopBar, SunsetTitle } from '@/components/run/Hud';
import { PixelTimer } from '@/components/run/PixelTimer';
import { QuestionBlock } from '@/components/run/QuestionBlock';
import { RunBackdrop, RunSky } from '@/components/run/RunSky';
import { useRunLight } from '@/components/run/sky';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge, Chip } from '@/components/ui/bits';
import { Sheet } from '@/components/ui/Sheet';
import { T } from '@/components/ui/Text';
import { copy } from '@/copy/en';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { practiceFact, practiceSource, rankedSource } from '@/run/sources';
import { useRunController } from '@/run/useRunController';
import { VISUAL } from '@/run/windows';
import { useGame } from '@/stores/game';
import { usePracticeResult } from '@/stores/practice';
import { useSettings } from '@/stores/settings';
import { useLayout } from '@/theme/layout';
import { LightScope } from '@/theme/LightProvider';
import { CANDY, CARD, LIGHTS, SIGNAL, SUNNY, WHITE } from '@/theme/palette';

const BURST = [SUNNY.body, WHITE, SIGNAL.correct, CANDY.pink.bg];

export default function RunRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const profile = useGame((s) => s.profile);
  if (!profile) return <Redirect href="/welcome" />;
  if (!id) return <Redirect href="/" />;
  return <RunScreen key={id} id={id} />;
}

function RunScreen({ id }: { id: string }) {
  const backend = useBackend();
  const practice = id === 'practice';
  const day = useGame((s) => s.day);
  const relaxed = useSettings((s) => s.relaxedPractice);
  const sound = useSettings((s) => s.sound);
  const setSound = useSettings((s) => s.setSound);
  const setPracticeResult = usePracticeResult((s) => s.set);
  const layout = useLayout();
  const insets = useSafeAreaInsets();
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [quitOpen, setQuitOpen] = useState(false);
  // Answers are never out of reach: if they don't fit, the ground scrolls even mid-question.
  const [fits, setFits] = useState({ box: 0, content: 0 });
  const burst = useRef<BurstHandle>(null);
  const scorePill = useRef<ComponentRef<typeof View>>(null);

  const source = useMemo(
    () => (practice ? practiceSource(relaxed ? RULES.RELAXED_QUESTION_MS : RULES.QUESTION_MS) : rankedSource(backend, id)),
    // The source must not change mid-run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [backend, id, practice],
  );

  const onDone = useCallback(
    (summary: RunSummary) => {
      if (practice) {
        setPracticeResult(summary);
        router.replace('/results/practice');
      } else {
        router.replace(`/results/${id}`);
      }
    },
    [id, practice, setPracticeResult],
  );

  const run = useRunController(source, { skipsLeft: practice ? RULES.SKIPS_PER_DAY : (day?.skipsLeft ?? RULES.SKIPS_PER_DAY), onDone });
  const { view } = run;
  const lightName = useRunLight(run.day);
  const light = LIGHTS[lightName];

  // Competition details and the "already in a run" case.
  const resumedOnce = useRef(false);
  useEffect(() => {
    if (practice) return;
    void backend.getCompetition(id).then(setCompetition);
  }, [backend, id, practice]);
  useEffect(() => {
    if (practice || resumedOnce.current || !day) return;
    if (day.activeRun?.competitionId === id) {
      resumedOnce.current = true;
      void run.resume();
    }
  }, [day, id, practice, run]);

  // Live rank during ranked runs.
  const board = useLeaderboard(practice ? null : id, 3);
  const prevRank = useRef<number | null>(null);
  const [rankDelta, setRankDelta] = useState(0);
  const myRank = board?.myRank ?? null;
  useEffect(() => {
    if (myRank === null) return;
    if (prevRank.current !== null && prevRank.current !== myRank) setRankDelta(prevRank.current - myRank);
    prevRank.current = myRank;
  }, [myRank]);

  // Sunny gets nervous as the moon closes in.
  const [hurry, setHurry] = useState(false);
  useAnimatedReaction(
    () => run.eclipse.value > 0.7,
    (late, prev) => {
      if (late !== prev) scheduleOnRN(setHurry, late);
    },
  );

  // Keyboard play on the web.
  const live = view.phase === 'live';
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const key = e.key.toLowerCase();
      if (quitOpen) return;
      if (view.phase === 'ready' && (key === 'enter' || key === ' ')) {
        e.preventDefault();
        void run.start();
        return;
      }
      if (key === 'escape' && view.phase !== 'ready' && view.phase !== 'sunset' && view.phase !== 'error') {
        setQuitOpen(true);
        return;
      }
      if (!live || !view.question) return;
      const n = view.question.options.length;
      const digit = ['1', '2', '3', '4'].indexOf(key);
      const letter = ['a', 'b', 'c', 'd'].indexOf(key);
      const pick = digit >= 0 ? digit : letter;
      if (pick >= 0 && pick < n) {
        e.preventDefault();
        run.answer(pick);
      } else if ((key === 's' || key === ' ') && view.skipsLeft > 0) {
        e.preventDefault();
        run.skip();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [live, quitOpen, run, view.phase, view.question, view.skipsLeft]);

  // A right answer throws a few pixels at the score.
  const celebrate = useCallback((rect: { x: number; y: number; width: number; height: number }) => {
    const target = scorePill.current;
    const fire = (toward: { x: number; y: number } | null) =>
      burst.current?.fire({ x: rect.x + rect.width * 0.12 + 17, y: rect.y + rect.height / 2, colors: BURST, count: 9, duration: VISUAL.burstMs, toward });
    if (!target) return fire(null);
    target.measureInWindow((x, y, w, h) => fire({ x: x + h / 2, y: y + h / 2 }));
  }, []);

  const kind = practice ? null : parseCompetitionId(id)?.kind;
  const title = practice ? copy.run.practice : kind ? SESSIONS[kind].title : 'Glint!';
  const split = layout.splitRun;
  // Short phones (SE, small Androids) get a lower sky and tighter tiles so all four answers fit.
  const short = !split && layout.height < 740;
  const skyW = split ? Math.round(layout.width * 0.44) : layout.width;
  const skyH = split ? layout.height : short ? Math.round(Math.max(layout.height * 0.24, 150)) : Math.round(Math.min(Math.max(layout.height * 0.3, 210), 300));
  const sunSize = split ? Math.min(skyW * 0.22, 170) : short ? 54 : Math.min(layout.width * 0.17, 68);
  const pill = split ? 60 : 44;
  const groundPad = split ? Math.max(32, layout.width * 0.04) : layout.gutter;
  const fact = practice && view.question && view.feedback ? practiceFact(view.question.qid) : undefined;
  const closed = competition ? phaseOf(competition, backend.now()) : null;
  const inRun = view.phase !== 'ready' && view.phase !== 'error';
  const outcome = view.feedback?.outcome;
  const mood: Mood =
    view.phase === 'sunset'
      ? 'sleepy'
      : outcome === 'correct'
        ? 'proud'
        : outcome === 'wrong' || outcome === 'silent'
          ? 'worried'
          : hurry && live
            ? 'wow'
            : 'happy';
  const asleep = !inRun || view.phase === 'starting';
  const hud = (
    <>
      <RunClock read={run.runLeftMs} phase={view.phase} size={pill} />
      <RunScore
        ref={scorePill}
        score={view.totals.score}
        rank={practice ? null : myRank}
        rankDelta={rankDelta}
        streak={view.totals.streak}
        lastDelta={view.lastDelta}
        size={pill}
        light={light}
        compact={!split}
      />
    </>
  );

  return (
    <LightScope name={lightName}>
      <View style={{ flex: 1, flexDirection: split ? 'row' : 'column' }} role="main">
        <Head>
          <title>{`${title} — Glint!`}</title>
        </Head>
        <StatusBar style={light.statusBar} />
        <RunBackdrop day={run.day} />

        <RunSky
          day={run.day}
          eclipse={run.eclipse}
          dusk={run.dusk}
          width={skyW}
          height={skyH}
          sunSize={sunSize}
          phase={view.phase}
          mood={asleep ? 'happy' : mood}
          floor={split ? pill + 40 : Math.round(sunSize * 0.34)}
          ceiling={insets.top + (split ? 60 : 58)}
        >
          <View style={{ flex: 1, paddingTop: insets.top + 10, paddingHorizontal: split ? groundPad * 0.7 : layout.gutter, paddingBottom: 14 }}>
            <RunTopBar
              title={title}
              practice={practice}
              sound={sound}
              onSound={() => setSound(!sound)}
              onQuit={() => (inRun ? setQuitOpen(true) : router.back())}
              canQuit={view.phase !== 'sunset'}
            >
              {/* On a phone the clock and score ride in the top bar, leaving the sky to the sun. */}
              {!split && inRun && view.phase !== 'sunset' ? hud : null}
            </RunTopBar>
            <View style={{ flex: 1 }} />
            {split && view.phase !== 'sunset' ? (
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>{hud}</View>
            ) : null}
          </View>
        </RunSky>

        <View style={{ flex: 1 }}>
          {inRun ? (
            <View style={{ paddingHorizontal: groundPad, paddingTop: split ? insets.top + 28 : 4 }}>
              <PixelTimer eclipse={run.eclipse} color={light.sun} track="rgba(255, 255, 255, 0.4)" height={split ? 18 : 14} />
            </View>
          ) : null}
          <ScrollView
            style={{ flex: 1 }}
            onLayout={(e) => {
              const box = e.nativeEvent.layout.height;
              setFits((f) => (Math.abs(f.box - box) < 1 ? f : { ...f, box }));
            }}
            onContentSizeChange={(_w, content) => setFits((f) => (Math.abs(f.content - content) < 1 ? f : { ...f, content }))}
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: split ? 'center' : 'flex-start',
              paddingHorizontal: groundPad,
              paddingTop: split ? 24 : 14,
              paddingBottom: insets.bottom + 18,
              gap: 16,
            }}
            scrollEnabled={!live || fits.content > fits.box + 1}
          >
            {view.reconnecting ? (
              <Chip tone="solid" icon="clock">
                {copy.run.reconnecting}
              </Chip>
            ) : null}

            {view.phase === 'ready' || view.phase === 'starting' ? (
              <ReadyPanel
                title={title}
                practice={practice}
                relaxed={relaxed}
                skipsLeft={practice ? RULES.SKIPS_PER_DAY : (day?.skipsLeft ?? RULES.SKIPS_PER_DAY)}
                starting={view.phase === 'starting'}
                blocked={!practice && closed !== null && closed !== 'open' ? (closed === 'upcoming' ? 'upcoming' : 'closed') : null}
                played={!practice && Boolean(day?.played[id]?.status === 'done')}
                onStart={() => void run.start()}
                onBack={() => (practice ? router.back() : router.replace(`/competition/${id}`))}
                competitionId={id}
              />
            ) : view.phase === 'error' ? (
              <ErrorPanel message={view.error ?? ''} code={view.errorCode} competitionId={id} practice={practice} />
            ) : (
              <>
                <QuestionBlock
                  question={view.question}
                  questionKey={view.questionKey}
                  phase={view.phase}
                  feedback={view.feedback}
                  onAnswer={run.answer}
                  onCorrect={celebrate}
                  wide={split}
                  compact={short}
                  fact={fact}
                />
                <View style={{ flex: 1 }} />
                <RunFooter
                  skipsLeft={view.skipsLeft}
                  enabled={live && view.skipsLeft > 0}
                  onSkip={run.skip}
                  syncing={view.syncing}
                  practice={practice}
                  showKeys={Platform.OS === 'web' && !layout.isPhone}
                />
              </>
            )}
          </ScrollView>
          {/* The countdown and the last word take the stage where the question will be (or was). */}
          {view.phase === 'intro' || view.phase === 'sunset' ? (
            <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: '30%', alignItems: 'center', justifyContent: 'center' }}>
              {view.phase === 'intro' ? <IntroCountdown size={split ? 170 : 128} /> : <SunsetTitle size={split ? 130 : 96} />}
            </View>
          ) : null}
        </View>

        <Sheet visible={quitOpen} onClose={() => setQuitOpen(false)} title={copy.run.quitTitle}>
          <T v="body" muted>
            {practice ? 'Practice games don’t count, so nothing is lost.' : copy.run.quitBody}
          </T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            <Button label={copy.run.keepGoing} onPress={() => setQuitOpen(false)} iconLeft="play" />
            <Button
              label={copy.run.quit}
              variant="ink"
              onPress={() => {
                setQuitOpen(false);
                run.quit();
              }}
            />
          </View>
        </Sheet>

        <BurstHost ref={burst} />
      </View>
    </LightScope>
  );
}

function ReadyPanel({
  title,
  practice,
  relaxed,
  skipsLeft,
  starting,
  blocked,
  played,
  onStart,
  onBack,
  competitionId,
}: {
  title: string;
  practice: boolean;
  relaxed: boolean;
  skipsLeft: number;
  starting: boolean;
  blocked: 'upcoming' | 'closed' | null;
  played: boolean;
  onStart: () => void;
  onBack: () => void;
  competitionId: string;
}) {
  if (played) {
    return (
      <PopIn>
        <Card contentStyle={{ gap: 14, alignItems: 'center' }}>
          <Sunny size={96} mood="proud" />
          <T v="l" align="center" accessibilityRole="header">
            You’ve played this one!
          </T>
          <T v="body" muted align="center">
            Everyone gets one go, so it’s fair.
          </T>
          <Button label={copy.play.myScore} href={`/results/${competitionId}`} />
        </Card>
      </PopIn>
    );
  }
  if (blocked) {
    return (
      <PopIn>
        <Card contentStyle={{ gap: 14, alignItems: 'center' }}>
          <Sunny size={96} mood="sleepy" />
          <T v="l" align="center" accessibilityRole="header">
            {blocked === 'upcoming' ? 'Not open yet' : 'This one is over'}
          </T>
          <Button label="Back" variant="ink" iconLeft="arrow-left" onPress={onBack} />
        </Card>
      </PopIn>
    );
  }
  const steps = copy.run.readySteps.map((s, i) =>
    i === 1 && practice && relaxed ? { ...s, text: '10 seconds for each question (relaxed)' } : s,
  );
  return (
    <PopIn>
      <Card contentStyle={{ gap: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <T v="xl" accessibilityRole="header" style={{ flex: 1 }}>
            {copy.run.readyTitle}
          </T>
          {practice ? <Chip tone="sun">{copy.run.practice}</Chip> : null}
        </View>
        <View style={{ gap: 10 }}>
          {steps.map((step) => (
            <View key={step.text} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: CARD.deep, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={step.icon as IconName} color={CARD.ink} size={20} strokeWidth={2.6} filled={step.icon !== 'clock'} />
              </View>
              <T v="title" style={{ flex: 1 }}>
                {step.text}
              </T>
            </View>
          ))}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: CARD.deep, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="skip" color={CARD.ink} size={20} strokeWidth={2.6} />
            </View>
            <T v="title" style={{ flex: 1 }}>
              {practice ? 'Skip any question you like' : `${copy.run.skipsLeft(skipsLeft)}. A skip costs nothing.`}
            </T>
          </View>
        </View>
        <Button label={copy.run.go} size="xl" iconLeft="play" stretch idle="pulse" onPress={onStart} loading={starting} accessibilityHint={Platform.OS === 'web' ? copy.run.startHint : undefined} />
        {!practice ? (
          <T v="bodyS" muted align="center">
            {copy.run.oneGo(title)}
          </T>
        ) : (
          <T v="bodyS" muted align="center">
            {copy.run.practiceNote}
          </T>
        )}
      </Card>
    </PopIn>
  );
}

function ErrorPanel({ message, code, competitionId, practice }: { message: string; code: string | null; competitionId: string; practice: boolean }) {
  return (
    <Card contentStyle={{ gap: 14, alignItems: 'center' }}>
      <Sunny size={88} mood="worried" />
      <T v="m" align="center" accessibilityRole="header">
        {message}
      </T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
        {code === 'already-played' ? <Button label={copy.play.myScore} href={`/results/${competitionId}`} /> : null}
        <Button label={practice ? 'Home' : 'Back'} variant="ink" iconLeft="arrow-left" href={practice ? '/' : `/competition/${competitionId}`} />
      </View>
    </Card>
  );
}

function RunFooter({
  skipsLeft,
  enabled,
  onSkip,
  syncing,
  practice,
  showKeys,
}: {
  skipsLeft: number;
  enabled: boolean;
  onSkip: () => void;
  syncing: boolean;
  practice: boolean;
  showKeys: boolean;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' }}>
      <View>
        <Button
          label={skipsLeft > 0 ? copy.run.skip : copy.run.noSkips}
          variant="ink"
          size="m"
          iconLeft="skip"
          onPress={onSkip}
          inert={!enabled && skipsLeft > 0}
          disabled={skipsLeft === 0}
          accessibilityLabel={skipsLeft > 0 ? `${copy.run.skip}. ${copy.run.skipsLeft(skipsLeft)}` : copy.run.noSkips}
        />
        {skipsLeft > 0 ? <Badge count={skipsLeft} style={{ position: 'absolute', top: -10, right: -10 }} /> : null}
      </View>
      {syncing ? (
        <Chip tone="solid" icon="clock">
          {copy.run.syncing}
        </Chip>
      ) : showKeys ? (
        <Chip tone="solid">{copy.run.keys}</Chip>
      ) : practice ? (
        <Chip tone="solid" icon="sparkle">
          Just for fun
        </Chip>
      ) : null}
    </View>
  );
}

