import { useEffect } from 'react';
import { Platform, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { GROUND, SIGNAL } from '@/theme/palette';
import { FONTS } from '@/theme/typography';
import { Icon } from '../icons';
import { Tap } from '../ui/Tap';
import { T } from '../ui/Text';

export type OptionState = 'idle' | 'locked' | 'correct' | 'wrong' | 'answer' | 'dim';

/**
 * One answer. Lit green when right, red and shaken when wrong; the right
 * answer is always shown after a miss. Never colour alone: ✓ / ✕ badges too.
 */
export function AnswerOption({
  index,
  label,
  state,
  enabled,
  onPress,
  tall,
  accent,
  order,
  total,
  grow,
}: {
  index: number;
  label: string;
  state: OptionState;
  enabled: boolean;
  onPress: () => void;
  tall?: boolean;
  accent: string;
  order: number;
  total: number;
  /** share the row's width (side-by-side layouts) */
  grow?: boolean;
}) {
  const shake = useSharedValue(0);
  const pop = useSharedValue(1);
  const enter = useSharedValue(0);

  useEffect(() => {
    enter.value = 0;
    enter.value = withDelay(order * 28, withTiming(1, { duration: 170, easing: Easing.out(Easing.cubic) }));
  }, [enter, order, label]);

  useEffect(() => {
    if (state === 'wrong') {
      shake.value = withSequence(
        withTiming(-8, { duration: 40 }),
        withTiming(8, { duration: 60 }),
        withTiming(-5, { duration: 55 }),
        withTiming(3, { duration: 50 }),
        withTiming(0, { duration: 45 }),
      );
    }
    if (state === 'correct') {
      pop.value = withSequence(withTiming(1.035, { duration: 90 }), withSpring(1, { damping: 12, stiffness: 260 }));
    }
  }, [pop, shake, state]);

  const animated = useAnimatedStyle(() => ({
    opacity: enter.value * (state === 'dim' ? 0.32 : 1),
    transform: [{ translateY: (1 - enter.value) * 14 }, { translateX: shake.value }, { scale: pop.value }],
  }));

  const bg = state === 'correct' ? SIGNAL.correct : state === 'wrong' ? SIGNAL.wrong : GROUND.raised;
  const fg = state === 'correct' ? SIGNAL.onCorrect : state === 'wrong' ? SIGNAL.onWrong : GROUND.ink;
  const border = state === 'answer' ? SIGNAL.correct : state === 'locked' ? GROUND.ink : 'transparent';
  const outcome = state === 'correct' ? ', right' : state === 'wrong' ? ', wrong' : state === 'answer' ? ', the right answer' : '';

  return (
    <Animated.View style={[grow ? { flex: 1 } : { alignSelf: 'stretch' }, animated]}>
      <Tap
        onPress={onPress}
        disabled={!enabled}
        feel={false}
        accessibilityRole="button"
        accessibilityLabel={`Option ${index + 1} of ${total}: ${label}${outcome}`}
        accessibilityState={{ disabled: !enabled, selected: state === 'locked' }}
        style={({ hovered, pressed }) => ({
          flex: grow ? 1 : undefined,
          minHeight: tall ? 116 : 64,
          borderRadius: 20,
          paddingHorizontal: tall ? 18 : 14,
          paddingVertical: tall ? 18 : 10,
          flexDirection: tall ? 'column' : 'row',
          alignItems: tall ? 'flex-start' : 'center',
          justifyContent: tall ? 'space-between' : 'flex-start',
          gap: 14,
          backgroundColor: state === 'idle' && hovered && enabled ? GROUND.hover : bg,
          borderWidth: 2,
          borderColor: border,
          transform: [{ scale: pressed && enabled ? 0.98 : 1 }],
        })}
      >
        {({ hovered }) => (
          <>
            <View
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor:
                  state === 'correct' || state === 'wrong'
                    ? 'rgba(0,0,0,0.14)'
                    : state === 'answer'
                      ? SIGNAL.correct
                      : hovered && enabled
                        ? accent
                        : 'rgba(243,244,255,0.08)',
              }}
            >
              {state === 'correct' || state === 'answer' ? (
                <Icon name="check" color={state === 'answer' ? SIGNAL.onCorrect : fg} size={18} strokeWidth={2.4} />
              ) : state === 'wrong' ? (
                <Icon name="cross" color={fg} size={18} strokeWidth={2.4} />
              ) : (
                <T
                  v="label"
                  color={hovered && enabled ? '#0B0C1C' : GROUND.muted}
                  style={{ fontFamily: FONTS.monoSemi, fontSize: 13, letterSpacing: 0 }}
                >
                  {Platform.OS === 'web' ? index + 1 : String.fromCharCode(65 + index)}
                </T>
              )}
            </View>
            <T
              v="title"
              color={fg}
              style={{ flexShrink: 1, fontFamily: FONTS.textBold, fontSize: tall ? 26 : 20, lineHeight: tall ? 30 : 25 }}
            >
              {label}
            </T>
          </>
        )}
      </Tap>
    </Animated.View>
  );
}
