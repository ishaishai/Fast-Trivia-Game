import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { CATEGORIES } from '@shared/questions/categories';
import type { PublicQuestion } from '@shared/types';
import { copy } from '@/copy/en';
import type { Feedback, RunPhase } from '@/run/useRunController';
import { ENTER_MS, EXIT_MS } from '@/run/windows';
import { CardScope } from '@/theme/LightProvider';
import { CARD } from '@/theme/palette';
import { Chip } from '../ui/bits';
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

/** The question on a white card, and its answers as big coloured tiles. */
export function QuestionBlock({
  question,
  questionKey,
  phase,
  feedback,
  onAnswer,
  onCorrect,
  wide,
  compact,
  fact,
}: {
  question: PublicQuestion | null;
  questionKey: number;
  phase: RunPhase;
  feedback: Feedback | null;
  onAnswer: (i: number) => void;
  onCorrect?: (rect: { x: number; y: number; width: number; height: number }) => void;
  wide: boolean;
  /** a short phone: smaller type and tiles */
  compact?: boolean;
  fact?: string;
}) {
  const shown = useSharedValue(0);
  const visible = phase === 'enter' || phase === 'live' || phase === 'pending' || phase === 'reveal';
  useEffect(() => {
    if (phase === 'exit' || phase === 'sunset') shown.set(withTiming(0, { duration: EXIT_MS }));
    else if (visible) shown.set(withTiming(1, { duration: ENTER_MS, easing: Easing.out(Easing.cubic) }));
    else shown.set(0);
  }, [phase, questionKey, shown, visible]);
  const block = useAnimatedStyle(() => ({ opacity: shown.value, transform: [{ translateY: (1 - shown.value) * 12 }] }));

  if (!question) return <View style={{ flex: 1 }} />;
  const n = question.options.length;
  const enabled = phase === 'live';
  const len = question.text.length;
  const textSize = wide ? (len <= 34 ? 40 : len <= 60 ? 34 : 30) : compact ? (len <= 34 ? 23 : len <= 60 ? 20 : 18) : len <= 34 ? 28 : len <= 60 ? 24 : 21;
  const pairs = n === 2 || (wide && n === 4);
  const rows: number[][] = pairs ? (n === 2 ? [[0, 1]] : [[0, 1], [2, 3]]) : question.options.map((_, i) => [i]);

  return (
    <Animated.View style={[{ gap: wide ? 20 : compact ? 10 : 14 }, block]} key={questionKey}>
      <View style={{ backgroundColor: CARD.field, borderRadius: 26, padding: wide ? 28 : compact ? 14 : 18, gap: compact ? 8 : 12, boxShadow: '0px 6px 0px 0px rgba(34, 27, 69, 0.18)' }}>
        <CardScope>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Chip tone="sun">{`Q${question.seq + 1}`}</Chip>
            <Chip>{CATEGORIES[question.category].label}</Chip>
            {question.trueFalse ? <Chip tone="line">{copy.run.trueFalse}</Chip> : null}
          </View>
          <T
            v="question"
            color={CARD.ink}
            accessibilityRole="header"
            accessibilityLiveRegion="polite"
            style={{ fontSize: textSize, lineHeight: Math.round(textSize * 1.2), maxWidth: 900 }}
          >
            {question.text}
          </T>
        </CardScope>
      </View>
      <View style={{ gap: compact ? 4 : 8 }}>
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
                shown={visible}
                onPress={() => onAnswer(i)}
                onCorrect={onCorrect}
                tall={n === 2}
                compact={compact}
                grow={row.length > 1}
              />
            ))}
          </View>
        ))}
      </View>
      {fact && feedback && feedback.outcome !== 'pending' ? (
        <View style={{ backgroundColor: 'rgba(255, 255, 255, 0.92)', borderRadius: 18, padding: 14 }}>
          <T v="bodyS" color={CARD.ink} style={{ maxWidth: 640 }}>
            {fact}
          </T>
        </View>
      ) : null}
    </Animated.View>
  );
}
