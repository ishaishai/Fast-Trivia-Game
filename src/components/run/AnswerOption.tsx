import { useEffect, useRef, type ComponentRef } from 'react';
import { Platform, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { VISUAL } from '@/run/windows';
import { springs, useMotionOK } from '@/theme/motion';
import { SIGNAL, TILES } from '@/theme/palette';
import { FONTS } from '@/theme/typography';
import { Icon } from '../icons';
import { Tap } from '../ui/Tap';
import { T } from '../ui/Text';

export type OptionState = 'idle' | 'locked' | 'correct' | 'wrong' | 'answer' | 'dim';

const LIP = 6;

/**
 * One answer: a chunky coloured tile on a lip. Pressing pushes it down; right
 * turns it green with a pop and a burst of pixels, wrong turns it red with a
 * shake, and the right answer is always shown after a miss. Never colour
 * alone: ✓ / ✕ badges too. Every timing fits the server's windows (windows.ts).
 */
export function AnswerOption({
  index,
  label,
  state,
  enabled,
  shown,
  onPress,
  onCorrect,
  tall,
  order,
  total,
  grow,
}: {
  index: number;
  label: string;
  state: OptionState;
  enabled: boolean;
  /** the question is on screen; tiles arrive once it is */
  shown: boolean;
  onPress: () => void;
  /** where the right answer is, in window coordinates, for the burst */
  onCorrect?: (rect: { x: number; y: number; width: number; height: number }) => void;
  tall?: boolean;
  order: number;
  total: number;
  /** share the row's width (side-by-side layouts) */
  grow?: boolean;
}) {
  const motion = useMotionOK();
  const box = useRef<ComponentRef<typeof View>>(null);
  const shake = useSharedValue(0);
  const pop = useSharedValue(1);
  const enter = useSharedValue(motion ? 0 : 1);
  const down = useSharedValue(0);

  useEffect(() => {
    if (!shown) return;
    if (!motion) {
      enter.set(1);
      return;
    }
    // Opacity is done by the time the clock starts; the springy scale can settle a moment after.
    enter.set(withDelay(order * VISUAL.tileStagger, withTiming(1, { duration: VISUAL.tileFade })));
  }, [enter, motion, order, shown]);

  useEffect(() => {
    if (state === 'locked') down.set(withSpring(LIP, springs.press));
    else if (state === 'idle') down.set(0);
    else down.set(withSpring(0, springs.release));
    if (!motion) return;
    if (state === 'wrong') {
      shake.set(
        withSequence(
          withTiming(-9, { duration: 40 }),
          withTiming(9, { duration: 60 }),
          withTiming(-6, { duration: 55 }),
          withTiming(3, { duration: 50 }),
          withTiming(0, { duration: 45 }),
        ),
      );
    }
    if (state === 'correct') {
      pop.set(withSequence(withTiming(1.07, { duration: 90 }), withSpring(1, springs.pop)));
      box.current?.measureInWindow((x, y, width, height) => onCorrect?.({ x, y, width, height }));
    }
    // onCorrect is a fresh closure each render; only a change of state should fire it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [down, motion, pop, shake, state]);

  const animated = useAnimatedStyle(() => ({
    opacity: enter.value * (state === 'dim' ? 0.35 : 1),
    transform: [{ translateY: (1 - enter.value) * 14 }, { translateX: shake.value }, { scale: pop.value * (0.92 + 0.08 * enter.value) }],
  }));
  const face = useAnimatedStyle(() => ({ transform: [{ translateY: down.value }] }));

  const tile = TILES[index % TILES.length];
  const bg = state === 'correct' || state === 'answer' ? SIGNAL.correct : state === 'wrong' ? SIGNAL.wrong : tile.bg;
  const lip = state === 'correct' || state === 'answer' ? SIGNAL.correctLip : state === 'wrong' ? SIGNAL.wrongLip : tile.lip;
  const fg = state === 'correct' || state === 'answer' ? SIGNAL.onCorrect : state === 'wrong' ? SIGNAL.onWrong : tile.fg;
  const outcome = state === 'correct' ? ', right' : state === 'wrong' ? ', wrong' : state === 'answer' ? ', the right answer' : '';
  const minHeight = tall ? 120 : 60;

  return (
    <Animated.View ref={box} collapsable={false} style={[grow ? { flex: 1 } : { alignSelf: 'stretch' }, animated]}>
      <Tap
        onPress={onPress}
        disabled={!enabled}
        feel={false}
        accessibilityRole="button"
        accessibilityLabel={`Option ${index + 1} of ${total}: ${label}${outcome}`}
        accessibilityState={{ disabled: !enabled, selected: state === 'locked' }}
        style={{ flex: grow ? 1 : undefined, borderRadius: 20 }}
        onPressIn={() => enabled && down.set(withSpring(LIP, springs.press))}
        onPressOut={() => enabled && state === 'idle' && down.set(withSpring(0, springs.release))}
      >
        {({ hovered }) => (
          <View style={{ flex: grow ? 1 : undefined, minHeight: minHeight + LIP }}>
            <View style={{ position: 'absolute', left: 0, right: 0, top: LIP, bottom: 0, borderRadius: 20, backgroundColor: lip }} />
            <Animated.View
              style={[
                {
                  flex: grow ? 1 : undefined,
                  minHeight,
                  marginBottom: LIP,
                  borderRadius: 20,
                  paddingHorizontal: tall ? 16 : 12,
                  paddingVertical: tall ? 16 : 10,
                  flexDirection: tall ? 'column' : 'row',
                  alignItems: tall ? 'flex-start' : 'center',
                  justifyContent: tall ? 'space-between' : 'flex-start',
                  gap: 12,
                  backgroundColor: bg,
                  borderWidth: 3,
                  borderColor: state === 'locked' ? '#FFFFFF' : hovered && enabled ? 'rgba(255, 255, 255, 0.55)' : 'transparent',
                  overflow: 'hidden',
                },
                face,
              ]}
            >
              <View pointerEvents="none" style={{ position: 'absolute', top: 3, left: 3, right: 3, height: '40%', borderTopLeftRadius: 16, borderTopRightRadius: 16, backgroundColor: 'rgba(255, 255, 255, 0.16)' }} />
              <View style={{ width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' }}>
                {state === 'correct' || state === 'answer' ? (
                  <Icon name="check" color={SIGNAL.correctLip} size={20} strokeWidth={3.2} />
                ) : state === 'wrong' ? (
                  <Icon name="cross" color={SIGNAL.wrongLip} size={20} strokeWidth={3.2} />
                ) : (
                  <T v="label" color={tile.lip} style={{ fontFamily: FONTS.display, fontSize: 17, lineHeight: 20 }}>
                    {Platform.OS === 'web' ? String(index + 1) : String.fromCharCode(65 + index)}
                  </T>
                )}
              </View>
              <T v="title" color={fg} style={{ flexShrink: 1, fontFamily: FONTS.textBold, fontSize: tall ? 24 : 19, lineHeight: tall ? 29 : 24 }}>
                {label}
              </T>
            </Animated.View>
          </View>
        )}
      </Tap>
    </Animated.View>
  );
}
