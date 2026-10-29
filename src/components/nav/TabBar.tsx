import { router, usePathname, type Href } from 'expo-router';
import { createContext, useContext, useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLight } from '@/theme/LightProvider';
import { springs, useMotionOK } from '@/theme/motion';
import { WHITE } from '@/theme/palette';
import { Icon, type IconName } from '../icons';
import { Tap } from '../ui/Tap';
import { T } from '../ui/Text';

export const TAB_BAR_HEIGHT = 64;
/** Gap between the floating bar and the bottom edge (above the home indicator). */
const FLOAT = 10;

const TABS: { href: Href; path: string; label: string; icon: IconName }[] = [
  { href: '/', path: '/', label: 'Play', icon: 'play' },
  { href: '/standings', path: '/standings', label: 'Ranks', icon: 'trophy' },
  { href: '/you', path: '/you', label: 'Me', icon: 'you' },
];

/** How much room the floating tab bar takes at the bottom of the screen (0 when there is none). */
const TabBarSpace = createContext(0);
export const TabBarSpaceProvider = TabBarSpace.Provider;
export function useTabBarSpace(): number {
  return useContext(TabBarSpace);
}
export function tabBarSpace(bottomInset: number): number {
  return TAB_BAR_HEIGHT + FLOAT + Math.max(bottomInset, FLOAT) + 8;
}

/**
 * Phone navigation: a white bar floating over the sky; the active tab gets a
 * sunny pill. It is drawn over the whole tab layout rather than in the
 * navigator's tab-bar slot: native views outside their parent's bounds don't
 * receive touches, and that slot has no height once the bar floats.
 */
export function TabBar() {
  const light = useLight();
  const insets = useSafeAreaInsets();
  const motion = useMotionOK();
  const path = usePathname();
  const [width, setWidth] = useState(0);
  const activeIndex = Math.max(0, TABS.findIndex((t) => (t.path === '/' ? path === '/' : path.startsWith(t.path))));
  const x = useSharedValue(0);
  const slot = (width - 12) / TABS.length;
  useEffect(() => {
    if (!slot) return;
    x.set(motion ? withSpring(activeIndex * slot, springs.pop) : activeIndex * slot);
  }, [activeIndex, motion, slot, x]);
  const pill = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <View
      role="navigation"
      aria-label="Main"
      pointerEvents="box-none"
      style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingBottom: Math.max(insets.bottom, FLOAT) }}
    >
      <View
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={{
          flexDirection: 'row',
          height: TAB_BAR_HEIGHT,
          padding: 6,
          borderRadius: 26,
          backgroundColor: WHITE,
          boxShadow: `0px 5px 0px 0px ${light.shadow}, 0px 14px 28px -10px ${light.shadow}`,
        }}
      >
        {width ? (
          <Animated.View
            pointerEvents="none"
            style={[{ position: 'absolute', top: 6, bottom: 6, left: 6, width: slot, borderRadius: 20, backgroundColor: light.sun, boxShadow: `0px 3px 0px 0px ${light.sunLip}` }, pill]}
          />
        ) : null}
        {TABS.map((tab, i) => (
          <TabButton key={tab.path} tab={tab} focused={i === activeIndex} onPress={() => router.navigate(tab.href)} />
        ))}
      </View>
    </View>
  );
}

function TabButton({ tab, focused, onPress }: { tab: (typeof TABS)[number]; focused: boolean; onPress: () => void }) {
  const light = useLight();
  const motion = useMotionOK();
  const hop = useSharedValue(0);
  useEffect(() => {
    if (!focused || !motion) return;
    hop.set(withSequence(withTiming(-7, { duration: 120 }), withSpring(0, springs.wobble)));
  }, [focused, hop, motion]);
  const icon = useAnimatedStyle(() => ({ transform: [{ translateY: hop.value }] }));
  const color = focused ? light.onSun : light.card.muted;
  return (
    <Tap
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={tab.label}
      onPress={onPress}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }}
    >
      <Animated.View style={icon}>
        <Icon name={tab.icon} color={color} size={22} strokeWidth={2.4} filled={focused && tab.icon !== 'you'} />
      </Animated.View>
      <T v="label" color={color} style={{ fontSize: 15 }}>
        {tab.label}
      </T>
    </Tap>
  );
}
