import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { View, type ScrollViewProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedReaction,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useScrollFlag } from '@/stores/ui';
import { springs, useMotionOK } from '@/theme/motion';

interface SceneValue {
  scrollY: SharedValue<number>;
  viewport: SharedValue<number>;
}

interface SectionValue {
  top: SharedValue<number>;
  height: SharedValue<number>;
  /** 1 once the section's top is well inside the viewport */
  inView: SharedValue<number>;
}

const SceneContext = createContext<SceneValue | null>(null);
const SectionContext = createContext<SectionValue | null>(null);

export function useScene(): SceneValue | null {
  return useContext(SceneContext);
}

export function useSection(): SectionValue | null {
  return useContext(SectionContext);
}

/**
 * A scrolling page whose scroll position drives animation on the UI thread:
 * sections reveal as they arrive, the hero eclipses, layers drift.
 */
export function ScrollScene({
  children,
  contentContainerStyle,
  scrollY: external,
  ...rest
}: ScrollViewProps & { children: ReactNode; /** for chrome outside the scene that follows the scroll */ scrollY?: SharedValue<number> }) {
  const own = useSharedValue(0);
  const scrollY = external ?? own;
  const viewport = useSharedValue(800);
  const setScrolled = useScrollFlag((s) => s.setScrolled);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });
  useAnimatedReaction(
    () => scrollY.value > 24,
    (scrolled, prev) => {
      // Lets the top navigation turn solid once the page moves.
      if (scrolled !== prev) scheduleOnRN(setScrolled, scrolled);
    },
  );
  useEffect(() => () => setScrolled(false), [setScrolled]);
  return (
    <SceneContext.Provider value={{ scrollY, viewport }}>
      <Animated.ScrollView
        {...rest}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onLayout={(e) => {
          viewport.value = e.nativeEvent.layout.height;
          rest.onLayout?.(e);
        }}
        contentContainerStyle={contentContainerStyle}
      >
        {children}
      </Animated.ScrollView>
    </SceneContext.Provider>
  );
}

/** A direct child of a ScrollScene. Knows where it sits, so its children can react to scroll. */
export function Section({
  children,
  style,
  nativeID,
  accessibilityLabel,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  nativeID?: string;
  accessibilityLabel?: string;
}) {
  const scene = useScene();
  const top = useSharedValue(0);
  const height = useSharedValue(0);
  const measured = useSharedValue(0);
  const inView = useDerivedValue<number>(() => {
    if (!scene) return 1;
    if (!measured.value) return 0;
    return scene.scrollY.value + scene.viewport.value * 0.88 > top.value ? 1 : 0;
  });
  return (
    <SectionContext.Provider value={{ top, height, inView }}>
      <View
        nativeID={nativeID}
        role="region"
        aria-label={accessibilityLabel}
        onLayout={(e) => {
          top.value = e.nativeEvent.layout.y;
          height.value = e.nativeEvent.layout.height;
          measured.value = 1;
        }}
        style={style}
      >
        {children}
      </View>
    </SectionContext.Provider>
  );
}

/** Pops its children in, springing slightly past their place, once their section scrolls into view. */
export function Reveal({
  children,
  delay = 0,
  from = 18,
  style,
}: {
  children: ReactNode;
  delay?: number;
  from?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const section = useSection();
  const motion = useMotionOK();
  const shown = useSharedValue(motion ? 0 : 1);
  const fallback = useSharedValue(1);
  const source = section?.inView ?? fallback;
  useAnimatedReaction(
    () => source.value,
    (v) => {
      if (v === 1 && shown.value === 0) shown.value = withDelay(delay, withSpring(1, springs.pop));
    },
  );
  const animated = useAnimatedStyle(() => ({
    opacity: Math.min(1, shown.value * 1.8),
    transform: [{ translateY: (1 - shown.value) * from }, { scale: 0.94 + 0.06 * shown.value }],
  }));
  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}

/** Drifts at a different speed from the page — subtle depth. */
export function Parallax({
  children,
  speed = 0.15,
  style,
}: {
  children: ReactNode;
  speed?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const scene = useScene();
  const section = useSection();
  const motion = useMotionOK();
  const animated = useAnimatedStyle(() => {
    if (!scene || !motion) return {};
    const anchor = section ? section.top.value : 0;
    return { transform: [{ translateY: (scene.scrollY.value - anchor) * speed }] };
  });
  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}
