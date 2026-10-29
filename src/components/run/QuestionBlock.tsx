import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { CATEGORIES } from '@shared/questions/categories';
import type { PublicQuestion } from '@shared/types';
import { copy } from '@/copy/en';
import type { Feedback, RunPhase } from '@/run/useRunController';
import { GROUND } from '@/theme/palette';
import { FONTS } from '@/theme/typography';
import { T } from '../ui/Text';
import { AnswerOption, type OptionState } from './AnswerOption';

function optionState(i: number, feedback: Feedback | null): OptionState {
  if (!feedback) return 'idle';
  if (feedback.outcome === 'pending') return feedback.choice === i ? 'locked' : 'idle';
  if (feedback.outcome === 'skipped' || feedback.outcome === 'sunset') return 'dim';
  if (feedback.choice === i) return feedback.outcome === 'correct' ? 'correct' : 'wrong';
  if (feedback.correctIndex === i) return 'answer';
  return 'dim';
}

/** The question and its answers, on the run's fixed dark ground. */
export function QuestionBlock({
  question,
  questionKey,
  phase,
  feedback,
  onAnswer,
  wide,
  accent,
  fact,
}: {
  question: PublicQuestion | null;
  questionKey: number;
  phase: RunPhase;
  feedback: Feedback | null;
  onAnswer: (i: number) => void;
  wide: boolean;
  accent: string;
  fact?: string;
}) {
  const shown = useSharedValue(0);
  const visible = phase === 'enter' || phase === 'live' || phase === 'pending' || phase === 'reveal';
  useEffect(() => {
    if (phase === 'exit' || phase === 'sunset') shown.value = withTiming(0, { duration: 100 });
    else if (visible) shown.value = withTiming(1, { duration: 180, easing: Easing.out(Easing.cubic) });
    else shown.value = 0;
  }, [phase, questionKey, shown, visible]);
  const block = useAnimatedStyle(() => ({ opacity: shown.value, transform: [{ translateY: (1 - shown.value) * 12 }] }));

  if (!question) return <View style={{ flex: 1 }} />;
  const n = question.options.length;
  const enabled = phase === 'live';
  const textSize = question.text.length <= 34 ? (wide ? 46 : 32) : question.text.length <= 52 ? (wide ? 40 : 28) : wide ? 34 : 25;
  const pairs = n === 2 || (wide && n === 4);
  const rows: number[][] = pairs ? (n === 2 ? [[0, 1]] : [[0, 1], [2, 3]]) : question.options.map((_, i) => [i]);

  return (
    <Animated.View style={[{ gap: wide ? 28 : 20 }, block]} key={questionKey}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <T v="label" color={GROUND.muted}>
          Q{question.seq + 1}
        </T>
        <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: accent }} />
        <T v="label" color={GROUND.ink}>
          {CATEGORIES[question.category].label}
        </T>
        {question.trueFalse ? (
          <View style={{ paddingHorizontal: 10, height: 22, borderRadius: 11, borderWidth: 1, borderColor: GROUND.line, justifyContent: 'center' }}>
            <T v="label" color={GROUND.muted} style={{ fontSize: 10 }}>
              {copy.run.trueFalse}
            </T>
          </View>
        ) : null}
      </View>
      <T
        v="question"
        color={GROUND.ink}
        accessibilityRole="header"
        accessibilityLiveRegion="polite"
        style={{ fontSize: textSize, lineHeight: Math.round(textSize * 1.14), fontFamily: FONTS.textBold, maxWidth: 900 }}
      >
        {question.text}
      </T>
      <View style={{ gap: 10 }}>
        {rows.map((row, r) => (
          <View key={r} style={{ flexDirection: row.length > 1 ? 'row' : 'column', gap: 10 }}>
            {row.map((i) => (
              <AnswerOption
                key={`${questionKey}-${i}`}
                index={i}
                order={i}
                total={n}
                label={question.options[i]}
                state={optionState(i, feedback)}
                enabled={enabled}
                onPress={() => onAnswer(i)}
                tall={n === 2}
                grow={row.length > 1}
                accent={accent}
              />
            ))}
          </View>
        ))}
      </View>
      {fact && feedback && feedback.outcome !== 'pending' ? (
        <T v="bodyS" color={GROUND.muted} style={{ maxWidth: 640 }}>
          {fact}
        </T>
      ) : null}
    </Animated.View>
  );
}
