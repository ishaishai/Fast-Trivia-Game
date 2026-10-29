import { Redirect, router, useLocalSearchParams } from 'expo-router';
import Head from 'expo-router/head';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RULES } from '@shared/rules';
import { SESSIONS, parseCompetitionId, phaseOf } from '@shared/schedule';
import type { Competition, RunSummary } from '@shared/types';
import { useBackend } from '@/backend/BackendProvider';
import { Icon } from '@/components/icons';
import { IntroCountdown, RunClock, RunScore, RunTopBar, SunsetTitle } from '@/components/run/Hud';
import { QuestionBlock } from '@/components/run/QuestionBlock';
import { Horizon, RunSky } from '@/components/run/RunSky';
import { useRunLight } from '@/components/run/sky';
import { SkipBank } from '@/components/sky/SkipBank';
import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { Tap } from '@/components/ui/Tap';
import { T } from '@/components/ui/Text';
import { copy } from '@/copy/en';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { practiceFact, practiceSource, rankedSource } from '@/run/sources';
import { useRunController } from '@/run/useRunController';
import { useGame } from '@/stores/game';
import { usePracticeResult } from '@/stores/practice';
import { useSettings } from '@/stores/settings';
import { useLayout } from '@/theme/layout';
import { GROUND, LIGHTS } from '@/theme/palette';
import { FONTS } from '@/theme/typography';

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

  const kind = practice ? null : parseCompetitionId(id)?.kind;
  const title = practice ? copy.run.practice : kind ? SESSIONS[kind].title : 'Meridian';
  const split = layout.splitRun;
  const skyW = split ? Math.round(layout.width * 0.46) : layout.width;
  const skyH = split ? layout.height : Math.round(Math.min(Math.max(layout.height * 0.36, 236), 360));
  const sunSize = split ? Math.min(skyW * 0.28, 230) : Math.min(layout.width * 0.22, 96);
  const big = split ? Math.min(150, skyW * 0.2) : 64;
  const groundPad = split ? Math.max(40, layout.width * 0.045) : layout.gutter;
  const accent = light.sun;
  const fact = practice && view.question && view.feedback ? practiceFact(view.question.qid) : undefined;
  const closed = competition ? phaseOf(competition, backend.now()) : null;
  const inRun = view.phase !== 'ready' && view.phase !== 'error';

  return (
    <View style={{ flex: 1, flexDirection: split ? 'row' : 'column', backgroundColor: GROUND.field }} role="main">
      <Head>
        <title>{`${title} — Meridian`}</title>
      </Head>
      <StatusBar style={light.statusBar} />

      <RunSky
        day={run.day}
        eclipse={run.eclipse}
        dusk={run.dusk}
        width={skyW}
        height={skyH}
        sunSize={sunSize}
        phase={view.phase}
        floor={big * 0.92 + 44}
        ceiling={insets.top + 64}
      >
        <View style={{ flex: 1, paddingTop: insets.top + 14, paddingHorizontal: split ? groundPad * 0.7 : layout.gutter, paddingBottom: 22 }}>
          <RunTopBar
            title={title}
            practice={practice}
            light={light}
            sound={sound}
            onSound={() => setSound(!sound)}
            onQuit={() => (inRun ? setQuitOpen(true) : router.back())}
            canQuit={view.phase !== 'sunset'}
          />
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            {view.phase === 'intro' ? <IntroCountdown light={light} size={split ? 150 : 84} /> : null}
            {view.phase === 'sunset' ? <SunsetTitle light={light} size={split ? 140 : 76} /> : null}
          </View>
          {view.phase !== 'sunset' ? (
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
              <RunClock read={run.runLeftMs} phase={view.phase} size={big} light={light} />
              <RunScore
                score={view.totals.score}
                rank={practice ? null : myRank}
                rankDelta={rankDelta}
                streak={view.totals.streak}
                lastDelta={view.lastDelta}
                size={big}
                light={light}
              />
            </View>
          ) : null}
        </View>
      </RunSky>

      <View style={{ flex: 1, backgroundColor: GROUND.field }}>
        {!split ? <Horizon eclipse={run.eclipse} day={run.day} width={layout.width} /> : null}
        {split ? (
          <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: 'rgba(243,244,255,0.10)' }} aria-hidden />
        ) : null}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: split ? 'center' : 'flex-start',
            paddingHorizontal: groundPad,
            paddingTop: split ? insets.top + 40 : 20,
            paddingBottom: insets.bottom + 18,
            gap: 18,
          }}
          scrollEnabled={!live}
        >
          {view.reconnecting ? (
            <View style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, backgroundColor: GROUND.raised }}>
              <T v="bodyS" color={GROUND.ink}>
                {copy.run.reconnecting}
              </T>
            </View>
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
              accent={accent}
              wide={split}
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
                wide={split}
                accent={accent}
                fact={fact}
              />
              <View style={{ flex: 1 }} />
              <RunFooter
                skipsLeft={view.skipsLeft}
                enabled={live && view.skipsLeft > 0}
                onSkip={run.skip}
                accent={accent}
                syncing={view.syncing}
                practice={practice}
                showKeys={Platform.OS === 'web' && !layout.isPhone}
              />
            </>
          )}
        </ScrollView>
      </View>

      <Sheet
        visible={quitOpen}
        onClose={() => setQuitOpen(false)}
        title={copy.run.quitTitle}
        colors={{ bg: GROUND.raised, ink: GROUND.ink, muted: GROUND.muted, line: GROUND.line }}
      >
        <T v="body" color={GROUND.muted}>
          {practice ? 'Practice runs don’t count, so nothing is lost.' : copy.run.quitBody}
        </T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          <Button
            label={copy.run.keepGoing}
            onPress={() => setQuitOpen(false)}
            colors={{ bg: accent, fg: '#0B0C1C', hoverBg: GROUND.ink, hoverFg: '#0B0C1C' }}
            icon={null}
          />
          <Button
            label={copy.run.quit}
            variant="ink"
            onPress={() => {
              setQuitOpen(false);
              run.quit();
            }}
            colors={{ bg: 'transparent', fg: GROUND.ink, hoverBg: GROUND.ink, hoverFg: '#0B0C1C' }}
          />
        </View>
      </Sheet>
    </View>
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
  accent,
  wide,
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
  accent: string;
  wide: boolean;
  competitionId: string;
}) {
  const layout = useLayout();
  const size = wide ? Math.min(96, layout.width * 0.06) : 48;
  if (played) {
    return (
      <View style={{ gap: 18 }}>
        <T v="label" color={GROUND.muted}>
          {title}
        </T>
        <T v="xl" color={GROUND.ink} style={{ fontSize: size, lineHeight: size * 0.95 }} accessibilityRole="header">
          You’ve run this one.
        </T>
        <T v="bodyL" color={GROUND.muted}>
          One run per competition — it keeps the crown honest.
        </T>
        <Button label={copy.results.eyebrow} href={`/results/${competitionId}`} colors={{ bg: accent, fg: '#0B0C1C', hoverBg: GROUND.ink, hoverFg: '#0B0C1C' }} />
      </View>
    );
  }
  if (blocked) {
    return (
      <View style={{ gap: 18 }}>
        <T v="label" color={GROUND.muted}>
          {title}
        </T>
        <T v="xl" color={GROUND.ink} style={{ fontSize: size, lineHeight: size * 0.95 }} accessibilityRole="header">
          {blocked === 'upcoming' ? 'The doors aren’t open yet.' : 'This one has closed.'}
        </T>
        <Button label="Back to the lobby" variant="ink" icon="arrow-left" onPress={onBack} colors={{ bg: 'transparent', fg: GROUND.ink, hoverBg: GROUND.ink, hoverFg: '#0B0C1C' }} />
      </View>
    );
  }
  return (
    <View style={{ gap: wide ? 26 : 18 }}>
      <T v="label" color={GROUND.muted}>
        {practice ? `${copy.run.practice} · ${copy.run.practiceNote}` : title}
      </T>
      <T v="xl" color={GROUND.ink} style={{ fontSize: size, lineHeight: size * 0.95 }} accessibilityRole="header">
        {copy.run.ready}
      </T>
      <View style={{ gap: 6 }}>
        <T v="bodyL" color={GROUND.ink}>
          {practice && relaxed ? '+3 right · −1 wrong · −1 silent · 6 s a question (relaxed)' : copy.run.rulesLine}
        </T>
        <T v="body" color={GROUND.muted}>
          Sixty seconds of answering. The clock pauses between questions, never during them.
        </T>
      </View>
      <SkipBank left={skipsLeft} size="s" color={accent} dimColor={GROUND.line} textColor={GROUND.ink} />
      <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <Button
          label={copy.run.start}
          onPress={onStart}
          loading={starting}
          colors={{ bg: accent, fg: '#0B0C1C', hoverBg: GROUND.ink, hoverFg: '#0B0C1C' }}
          icon="play"
        />
        {Platform.OS === 'web' ? (
          <T v="label" color={GROUND.muted}>
            {copy.run.startHint}
          </T>
        ) : null}
      </View>
      {!practice ? (
        <T v="bodyS" color={GROUND.muted}>
          Once the clock starts, this is your one run for {title}. Leaving doesn’t pause it.
        </T>
      ) : null}
    </View>
  );
}

function ErrorPanel({ message, code, competitionId, practice }: { message: string; code: string | null; competitionId: string; practice: boolean }) {
  return (
    <View style={{ gap: 18 }}>
      <T v="l" color={GROUND.ink} accessibilityRole="header">
        {message}
      </T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {code === 'already-played' ? (
          <Button label={copy.results.eyebrow} href={`/results/${competitionId}`} colors={{ bg: GROUND.ink, fg: '#0B0C1C', hoverBg: '#FFFFFF', hoverFg: '#0B0C1C' }} />
        ) : null}
        <Button
          label={practice ? copy.results.today : 'Back to the lobby'}
          variant="ink"
          icon="arrow-left"
          href={practice ? '/' : `/competition/${competitionId}`}
          colors={{ bg: 'transparent', fg: GROUND.ink, hoverBg: GROUND.ink, hoverFg: '#0B0C1C' }}
        />
      </View>
    </View>
  );
}

function RunFooter({
  skipsLeft,
  enabled,
  onSkip,
  accent,
  syncing,
  practice,
  showKeys,
}: {
  skipsLeft: number;
  enabled: boolean;
  onSkip: () => void;
  accent: string;
  syncing: boolean;
  practice: boolean;
  showKeys: boolean;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 16, justifyContent: 'space-between' }}>
      <Tap
        onPress={onSkip}
        disabled={!enabled}
        accessibilityRole="button"
        accessibilityLabel={skipsLeft > 0 ? `${copy.run.skip}. ${copy.run.skipsLeft(skipsLeft)}` : copy.run.noSkips}
        style={({ hovered, pressed }) => ({
          height: 50,
          paddingHorizontal: 20,
          borderRadius: 999,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          borderWidth: 1.5,
          borderColor: hovered && enabled ? accent : GROUND.line,
          backgroundColor: pressed && enabled ? GROUND.hover : 'transparent',
          opacity: enabled || skipsLeft > 0 ? 1 : 0.45,
        })}
      >
        <Icon name="skip" color={GROUND.ink} size={18} />
        <T v="title" color={GROUND.ink} style={{ fontFamily: FONTS.textBold }}>
          {skipsLeft > 0 ? copy.run.skip : copy.run.noSkips}
        </T>
        {showKeys ? (
          <View style={{ paddingHorizontal: 7, height: 22, borderRadius: 6, borderWidth: 1, borderColor: GROUND.line, justifyContent: 'center' }}>
            <T v="label" color={GROUND.muted} style={{ fontSize: 10, letterSpacing: 0.5 }}>
              S
            </T>
          </View>
        ) : null}
      </Tap>
      <View style={{ alignItems: 'flex-end', gap: 6 }}>
        <SkipBank left={skipsLeft} size="s" color={accent} dimColor={GROUND.line} textColor={GROUND.ink} />
        <T v="label" color={GROUND.muted} style={{ fontSize: 10 }}>
          {syncing ? copy.run.syncing : practice ? 'Practice skips' : showKeys ? copy.run.keys : copy.run.skipsLeft(skipsLeft)}
        </T>
      </View>
    </View>
  );
}
