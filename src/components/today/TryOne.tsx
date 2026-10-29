import { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { cancelAnimation, Easing, useSharedValue, withTiming } from 'react-native-reanimated';
import { PRACTICE } from '@shared/questions/practice';
import { shuffle } from '@shared/random';
import { RULES } from '@shared/rules';
import type { QuestionDef } from '@shared/types';
import { haptic } from '@/audio/haptics';
import { play } from '@/audio/sound';
import { copy } from '@/copy/en';
import { useLayout } from '@/theme/layout';
import { useLight } from '@/theme/LightProvider';
import { SIGNAL, TILES } from '@/theme/palette';
import { Sunny, type Mood } from '../brand/Sunny';
import { PixelTimer } from '../run/PixelTimer';
import { Button } from '../ui/Button';
import { Chip } from '../ui/bits';
import { T } from '../ui/Text';

type Phase = 'idle' | 'live' | 'done';

/** One practice question with the real three-second eclipse. Doesn't count. */
export function TryOne() {
  const light = useLight();
  const { isPhone } = useLayout();
  const [phase, setPhase] = useState<Phase>('idle');
  const [q, setQ] = useState<{ def: QuestionDef; order: number[] } | null>(null);
  const [pick, setPick] = useState<number | null>(null);
  const [ms, setMs] = useState(0);
  const eclipse = useSharedValue(0);
  const shownAt = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deck = useRef<QuestionDef[]>([]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const next = useCallback(() => {
    if (!deck.current.length) deck.current = shuffle(PRACTICE, Math.random);
    const def = deck.current.pop()!;
    const order = def.fixed ? def.a.map((_, i) => i) : shuffle(def.a.map((_, i) => i), Math.random);
    setQ({ def, order });
    setPick(null);
    setPhase('live');
    shownAt.current = Date.now();
    eclipse.set(0);
    eclipse.set(withTiming(1, { duration: RULES.QUESTION_MS, easing: Easing.linear }));
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setPhase('done');
      setMs(RULES.QUESTION_MS);
      play('silent');
      haptic('warning');
    }, RULES.QUESTION_MS);
  }, [eclipse]);

  const answer = useCallback(
    (displayIndex: number) => {
      if (phase !== 'live' || !q) return;
      if (timer.current) clearTimeout(timer.current);
      cancelAnimation(eclipse);
      setMs(Math.round(Date.now() - shownAt.current));
      setPick(displayIndex);
      setPhase('done');
      const right = q.order[displayIndex] === q.def.c;
      play(right ? 'correct' : 'wrong');
      haptic(right ? 'success' : 'error');
      if (right) eclipse.set(withTiming(0, { duration: 420 }));
    },
    [eclipse, phase, q],
  );

  const right = q && pick !== null ? q.order[pick] === q.def.c : false;
  const verdict = !q || phase !== 'done' ? null : pick === null ? `${copy.run.eclipsed}! −1` : right ? `Right! +3 in ${(ms / 1000).toFixed(2)}s` : 'Not quite. −1';
  const mood: Mood = phase === 'done' ? (right ? 'proud' : 'worried') : phase === 'live' ? 'wow' : 'happy';

  return (
    <View style={{ gap: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <Sunny size={64} mood={mood} rays={phase !== 'done' || right} />
        <View style={{ flex: 1, gap: 8 }}>
          <T v="label" muted>
            {copy.rules.tryBody}
          </T>
          <PixelTimer eclipse={eclipse} color={light.sun} track={light.deep} />
        </View>
      </View>
      {q ? (
        <>
          <T v="question" style={{ fontSize: isPhone ? 21 : 24, lineHeight: isPhone ? 27 : 30 }} accessibilityLiveRegion="polite">
            {q.def.q}
          </T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {q.order.map((orig, i) => {
              const isRight = orig === q.def.c;
              const done = phase === 'done';
              const tile = TILES[i % TILES.length];
              const colors =
                done && isRight
                  ? { bg: SIGNAL.correct, fg: SIGNAL.onCorrect, lip: SIGNAL.correctLip }
                  : done && pick === i
                    ? { bg: SIGNAL.wrong, fg: SIGNAL.onWrong, lip: SIGNAL.wrongLip }
                    : { bg: tile.bg, fg: tile.fg, lip: tile.lip };
              return (
                <View key={orig} style={{ width: q.order.length === 2 ? '100%' : '48%', flexGrow: 1, opacity: done && !isRight && pick !== i ? 0.4 : 1 }}>
                  <Button
                    label={q.def.a[orig]}
                    size="m"
                    stretch
                    colors={colors}
                    icon={done && isRight ? 'check' : done && pick === i ? 'cross' : null}
                    onPress={() => answer(i)}
                    inert={phase !== 'live'}
                    accessibilityLabel={`${q.def.a[orig]}${done && isRight ? ', right answer' : ''}`}
                  />
                </View>
              );
            })}
          </View>
          {verdict ? (
            <View style={{ gap: 6 }} accessibilityLiveRegion="polite">
              <Chip tone={right ? 'good' : 'solid'} icon={right ? 'star' : undefined}>
                {verdict}
              </Chip>
              {q.def.fact ? (
                <T v="bodyS" muted>
                  {q.def.fact}
                </T>
              ) : null}
            </View>
          ) : null}
        </>
      ) : (
        <T v="bodyL">Three seconds feels longer than it is. Ready?</T>
      )}
      {phase !== 'live' ? <Button label={q ? 'Another one' : 'Try a question'} size="m" iconLeft="play" onPress={next} /> : null}
    </View>
  );
}
