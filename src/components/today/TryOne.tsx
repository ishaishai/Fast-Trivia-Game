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
import { SIGNAL } from '@/theme/palette';
import { FONTS } from '@/theme/typography';
import { SunDisc } from '../sky/SunDisc';
import { Button } from '../ui/Button';
import { Tap } from '../ui/Tap';
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
  const verdict = !q || phase !== 'done' ? null : pick === null ? `${copy.run.eclipsed}. −1` : right ? `Right. +3 in ${(ms / 1000).toFixed(2)}s` : 'Wrong. −1';

  return (
    <View
      style={{
        backgroundColor: light.deep,
        borderRadius: 32,
        padding: isPhone ? 20 : 32,
        gap: 20,
        flexDirection: isPhone ? 'column' : 'row',
        alignItems: isPhone ? 'stretch' : 'center',
      }}
    >
      <View style={{ alignItems: 'center', justifyContent: 'center', width: isPhone ? undefined : 180 }}>
        <SunDisc size={isPhone ? 96 : 148} color={light.sun} sky={light.deep} eclipse={eclipse} />
      </View>
      <View style={{ flex: isPhone ? undefined : 1, gap: 14 }}>
        <T v="label" muted>
          {copy.rules.tryBody}
        </T>
        {q ? (
          <>
            <T v="title" style={{ fontFamily: FONTS.textBold, fontSize: isPhone ? 20 : 24, lineHeight: isPhone ? 26 : 30 }} accessibilityLiveRegion="polite">
              {q.def.q}
            </T>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {q.order.map((orig, i) => {
                const isRight = orig === q.def.c;
                const done = phase === 'done';
                const bg = done && isRight ? SIGNAL.correct : done && pick === i ? SIGNAL.wrong : light.raised;
                const fg = done && isRight ? SIGNAL.onCorrect : done && pick === i ? SIGNAL.onWrong : light.ink;
                return (
                  <Tap
                    key={orig}
                    onPress={() => answer(i)}
                    disabled={phase !== 'live'}
                    accessibilityRole="button"
                    accessibilityLabel={`${q.def.a[orig]}${done && isRight ? ', right answer' : ''}`}
                    style={({ hovered }) => ({
                      height: 46,
                      paddingHorizontal: 18,
                      borderRadius: 999,
                      justifyContent: 'center',
                      backgroundColor: hovered && phase === 'live' ? light.sun : bg,
                      opacity: done && !isRight && pick !== i ? 0.45 : 1,
                    })}
                  >
                    {({ hovered }) => (
                      <T v="title" color={hovered && phase === 'live' ? light.onSun : fg} style={{ fontSize: 16 }}>
                        {q.def.a[orig]}
                      </T>
                    )}
                  </Tap>
                );
              })}
            </View>
            {verdict ? (
              <View style={{ gap: 4 }} accessibilityLiveRegion="polite">
                <T v="label" color={light.sunText}>
                  {verdict}
                </T>
                {q.def.fact ? (
                  <T v="bodyS" muted>
                    {q.def.fact}
                  </T>
                ) : null}
              </View>
            ) : null}
          </>
        ) : (
          <T v="bodyL">Three seconds feels longer than it is. Until it doesn’t.</T>
        )}
        {phase !== 'live' ? (
          <Button label={q ? 'Another one' : 'Try a question'} size="m" icon="play" onPress={next} />
        ) : null}
      </View>
    </View>
  );
}
