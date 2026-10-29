import { useIsFocused } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import { useLight } from '@/theme/LightProvider';
import { useMotionOK } from '@/theme/motion';
import { SUNNY, WHITE } from '@/theme/palette';
import { useAmbientClock } from '../motion/Playful';

export type Mood = 'happy' | 'wow' | 'worried' | 'sleepy' | 'proud';

const FACE = SUNNY.face;

/**
 * Sunny, Meridian's sun: rays that turn, eyes that blink, a face that
 * reacts. Decorative — screen readers skip it.
 */
export function Sunny({
  size = 120,
  mood = 'happy',
  color,
  rays = true,
  style,
}: {
  size?: number;
  mood?: Mood;
  color?: string;
  rays?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const light = useLight();
  const fill = color ?? light.sun;
  const motion = useMotionOK();
  const focused = useIsFocused();
  const turn = useAmbientClock(18000, rays && focused);
  const blink = useSharedValue(1);
  useEffect(() => {
    if (!motion || mood === 'sleepy') {
      cancelAnimation(blink);
      blink.set(1);
      return;
    }
    blink.set(
      withRepeat(
        withSequence(withDelay(2800, withTiming(0.1, { duration: 70 })), withTiming(1, { duration: 90 }), withDelay(1400, withTiming(1, { duration: 0 }))),
        -1,
        false,
      ),
    );
    return () => cancelAnimation(blink);
  }, [blink, mood, motion]);
  const spin = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.value * 360}deg` }] }));
  const eyes = useAnimatedStyle(() => ({ transform: [{ scaleY: blink.value }] }));

  return (
    <View style={[{ width: size, height: size }, style]} pointerEvents="none" aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {rays ? (
        <Animated.View style={[StyleSheet.absoluteFill, spin]}>
          <Svg width={size} height={size} viewBox="0 0 120 120">
            {Array.from({ length: 12 }, (_, i) => (
              <Rect key={i} x="55" y="2" width="10" height="20" rx="5" fill={fill} opacity={0.9} transform={`rotate(${i * 30} 60 60)`} />
            ))}
          </Svg>
        </Animated.View>
      ) : null}
      <Svg width={size} height={size} viewBox="0 0 120 120" style={StyleSheet.absoluteFill}>
        <Circle cx="60" cy="60" r={rays ? 36 : 46} fill={fill} />
        <Circle cx={rays ? 47 : 44} cy={rays ? 46 : 42} r={rays ? 9 : 12} fill={WHITE} opacity={0.35} />
        <Ellipse cx="41" cy="70" rx="7" ry="4.5" fill={SUNNY.cheek} opacity={0.6} />
        <Ellipse cx="79" cy="70" rx="7" ry="4.5" fill={SUNNY.cheek} opacity={0.6} />
        <Mouth mood={mood} />
      </Svg>
      <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: '50% 47%' }, eyes]}>
        <Svg width={size} height={size} viewBox="0 0 120 120">
          <Eyes mood={mood} />
        </Svg>
      </Animated.View>
    </View>
  );
}

function Eyes({ mood }: { mood: Mood }) {
  if (mood === 'sleepy' || mood === 'proud') {
    return (
      <G stroke={FACE} strokeWidth="4" strokeLinecap="round" fill="none">
        <Path d={mood === 'proud' ? 'M42 58 Q47 52 52 58' : 'M42 55 Q47 60 52 55'} />
        <Path d={mood === 'proud' ? 'M68 58 Q73 52 78 58' : 'M68 55 Q73 60 78 55'} />
      </G>
    );
  }
  const big = mood === 'wow' || mood === 'worried';
  return (
    <G>
      <Ellipse cx="47" cy="56" rx={big ? 5 : 4.4} ry={big ? 6.5 : 5.6} fill={FACE} />
      <Ellipse cx="73" cy="56" rx={big ? 5 : 4.4} ry={big ? 6.5 : 5.6} fill={FACE} />
      <Circle cx="48.6" cy="53.6" r="1.6" fill={WHITE} />
      <Circle cx="74.6" cy="53.6" r="1.6" fill={WHITE} />
      {mood === 'worried' ? (
        <G stroke={FACE} strokeWidth="3" strokeLinecap="round">
          <Path d="M40 48 L51 44" />
          <Path d="M80 48 L69 44" />
        </G>
      ) : null}
    </G>
  );
}

function Mouth({ mood }: { mood: Mood }) {
  switch (mood) {
    case 'wow':
      return <Ellipse cx="60" cy="76" rx="6" ry="7" fill={FACE} />;
    case 'worried':
      return <Path d="M50 80 Q60 72 70 80" stroke={FACE} strokeWidth="4" strokeLinecap="round" fill="none" />;
    case 'sleepy':
      return <Path d="M53 74 Q60 79 67 74" stroke={FACE} strokeWidth="3.5" strokeLinecap="round" fill="none" />;
    default:
      return (
        <G>
          <Path d="M46 69 Q60 90 74 69 Z" fill={FACE} />
          <Path d="M53 79 Q60 74 67 79 Q60 84 53 79 Z" fill={SUNNY.tongue} />
        </G>
      );
  }
}
