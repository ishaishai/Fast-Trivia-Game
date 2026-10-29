import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import Animated, { useAnimatedReaction, useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming } from 'react-native-reanimated';
import { springs, useMotionOK } from '@/theme/motion';
import { glyphRoom } from '@/theme/typography';
import { useSection } from './ScrollScene';

/** A text style at `s` of its size. */
function scaled(style: TextStyle, s: number): TextStyle {
  return {
    ...style,
    fontSize: (style.fontSize as number) * s,
    ...(typeof style.lineHeight === 'number' ? { lineHeight: style.lineHeight * s } : null),
    ...(typeof style.letterSpacing === 'number' ? { letterSpacing: style.letterSpacing * s } : null),
  };
}

/**
 * A heading whose words pop in one after another, springing past their size
 * and settling, once its section scrolls into view. Screen readers get the
 * whole sentence.
 * Words never break, so when the longest one is wider than the line (a long
 * handle, a narrow phone) the whole heading scales down until it fits.
 */
export function WordsReveal({
  text,
  style,
  color,
  delay = 0,
  stagger = 55,
  accessibilityRole = 'header',
  containerStyle,
}: {
  text: string;
  style: TextStyle;
  color: string;
  delay?: number;
  stagger?: number;
  accessibilityRole?: 'header' | 'text';
  containerStyle?: StyleProp<ViewStyle>;
}) {
  const words = text.split(' ');
  const section = useSection();
  const motion = useMotionOK();
  const shown = useSharedValue(motion ? 0 : 1);
  const fallback = useSharedValue(1);
  const source = section?.inView ?? fallback;
  useAnimatedReaction(
    () => source.value,
    (v) => {
      if (v === 1 && shown.value === 0) shown.value = withDelay(delay, withTiming(1, { duration: 40 }));
    },
  );
  const [line, setLine] = useState(0);
  const [widest, setWidest] = useState(0);
  const widths = useRef<number[]>([]);
  const scale = line > 0 && widest > line ? line / widest : 1;
  const sized = scale < 1 ? scaled(style, scale) : style;
  // Word widths are kept at full size, so shrinking the heading doesn't feed back into the measurement.
  const measure = (index: number, width: number) => {
    widths.current[index] = width / scale;
    const next = Math.max(0, ...widths.current.slice(0, words.length).map((w) => w || 0));
    if (Math.abs(next - widest) > 0.5) setWidest(next);
  };
  const lineHeight = (sized.lineHeight as number) ?? (sized.fontSize as number) * 1.1;
  return (
    <View
      accessible
      accessibilityRole={accessibilityRole}
      accessibilityLabel={text}
      onLayout={(e) => setLine(e.nativeEvent.layout.width)}
      style={[{ flexDirection: 'row', flexWrap: 'wrap', columnGap: (sized.fontSize as number) * 0.24 }, containerStyle]}
    >
      {words.map((word, i) => (
        <Word
          key={`${word}-${i}`}
          word={word}
          index={i}
          trigger={shown}
          initial={motion ? 0 : 1}
          stagger={stagger}
          style={sized}
          color={color}
          lineHeight={lineHeight}
          onWidth={measure}
        />
      ))}
    </View>
  );
}

function Word({
  word,
  index,
  trigger,
  initial,
  stagger,
  style,
  color,
  lineHeight,
  onWidth,
}: {
  word: string;
  index: number;
  trigger: { value: number };
  initial: number;
  stagger: number;
  style: TextStyle;
  color: string;
  lineHeight: number;
  onWidth: (index: number, width: number) => void;
}) {
  const p = useSharedValue(initial);
  useAnimatedReaction(
    () => trigger.value,
    (v) => {
      if (v === 1 && p.value === 0) p.value = withDelay(index * stagger, withSpring(1, springs.pop));
    },
  );
  const animated = useAnimatedStyle(() => ({
    opacity: Math.min(1, p.value * 2),
    transform: [{ translateY: (1 - p.value) * lineHeight * 0.45 }, { scale: 0.4 + 0.6 * p.value }],
  }));
  return (
    <View onLayout={(e) => onWidth(index, e.nativeEvent.layout.width)}>
      <Animated.Text style={[style, glyphRoom(style), { color }, animated]} importantForAccessibility="no" accessibilityElementsHidden>
        {word}
      </Animated.Text>
    </View>
  );
}

/** One rolling digit column. */
function Digit({ digit, style, lineHeight }: { digit: number; style: StyleProp<TextStyle>; lineHeight: number }) {
  const motion = useMotionOK();
  const y = useSharedValue(-digit * lineHeight);
  useEffect(() => {
    y.value = motion ? withSpring(-digit * lineHeight, springs.pop) : -digit * lineHeight;
  }, [digit, lineHeight, motion, y]);
  const animated = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return (
    <View style={{ height: lineHeight, overflow: 'hidden' }}>
      <Animated.View style={animated}>
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
          <Text key={d} style={style}>
            {d}
          </Text>
        ))}
      </Animated.View>
    </View>
  );
}

/**
 * Numbers that roll like a mechanical counter. Non-digit characters
 * (+, −, :, #) sit still. `text` is what screen readers hear.
 */
export function Odometer({ value, style, accessibilityLabel }: { value: string; style: TextStyle; accessibilityLabel?: string }) {
  const lineHeight = (style.lineHeight as number) ?? (style.fontSize as number) * 1.05;
  // Each cell is exactly one line tall; the digits above and below in the column stay hidden.
  const cell = StyleSheet.flatten([style, { lineHeight, height: lineHeight }]);
  const cellStyle = [cell, glyphRoom(cell)];
  return (
    <View accessible accessibilityLabel={accessibilityLabel ?? value} style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
      {value.split('').map((ch, i) =>
        /[0-9]/.test(ch) ? (
          <Digit key={`${value.length - i}`} digit={Number(ch)} style={cellStyle} lineHeight={lineHeight} />
        ) : (
          <Text key={`${value.length - i}-${ch}`} style={cellStyle}>
            {ch}
          </Text>
        ),
      )}
    </View>
  );
}

/** Counts from `from` to `to` once, easing out. */
export function useCountUp(to: number, { from = 0, duration = 1100, delay = 0, enabled = true } = {}): number {
  const motion = useMotionOK();
  const animate = motion && enabled;
  const [value, setValue] = useState(animate ? from : to);
  const raf = useRef<number | null>(null);
  useEffect(() => {
    if (!animate) return;
    let start: number | null = null;
    const timer = setTimeout(() => {
      const step = (t: number) => {
        if (start === null) start = t;
        const p = Math.min(1, (t - start) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        setValue(Math.round(from + (to - from) * eased));
        if (p < 1) raf.current = requestAnimationFrame(step);
      };
      raf.current = requestAnimationFrame(step);
    }, delay);
    return () => {
      clearTimeout(timer);
      if (raf.current !== null) cancelAnimationFrame(raf.current);
    };
  }, [animate, delay, duration, from, to]);
  return animate ? value : to;
}
