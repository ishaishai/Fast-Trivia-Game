import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLight } from '@/theme/LightProvider';
import { springs } from '@/theme/motion';
import { Icon, type IconName } from '../icons';
import { Tap } from '../ui/Tap';
import { T } from '../ui/Text';

export const TAB_BAR_HEIGHT = 64;

const TABS: { name: string; label: string; icon: IconName }[] = [
  { name: 'index', label: 'Today', icon: 'today' },
  { name: 'standings', label: 'Standings', icon: 'standings' },
  { name: 'champions', label: 'Champions', icon: 'crown' },
  { name: 'you', label: 'You', icon: 'you' },
];

/** Phone navigation. A small sun slides to the active tab. */
export function TabBar({ state, navigateToTab }: BottomTabBarProps) {
  const light = useLight();
  const insets = useSafeAreaInsets();
  const [width, setWidth] = useState(0);
  const current = state.routes[state.index]?.name ?? 'index';
  const alias = current.startsWith('competition') || current === 'rules' ? 'index' : current.startsWith('results') ? 'standings' : current;
  const activeIndex = Math.max(0, TABS.findIndex((t) => t.name === alias));
  const x = useSharedValue(0);
  const slot = width / TABS.length;
  useEffect(() => {
    if (slot) x.value = withSpring(activeIndex * slot + slot / 2 - 3, springs.snappy);
  }, [activeIndex, slot, x]);
  const dot = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <View
      role="navigation"
      aria-label="Main"
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{
        flexDirection: 'row',
        paddingBottom: insets.bottom,
        backgroundColor: light.deep,
        borderTopWidth: 1,
        borderTopColor: light.line,
      }}
    >
      {width ? (
        <Animated.View style={[{ position: 'absolute', top: 6, left: 0, width: 6, height: 6, borderRadius: 3, backgroundColor: light.sun }, dot]} />
      ) : null}
      {TABS.map((tab, i) => {
        const focused = i === activeIndex;
        return (
          <Tap
            key={tab.name}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={tab.label}
            onPress={() => {
              const route = state.routes.find((r) => r.name === tab.name);
              if (route) navigateToTab(route.key);
            }}
            style={{ flex: 1, height: TAB_BAR_HEIGHT, alignItems: 'center', justifyContent: 'center', gap: 4 }}
          >
            <Icon name={tab.icon} color={focused ? light.ink : light.muted} size={22} />
            <T v="label" color={focused ? light.ink : light.muted} style={{ fontSize: 10, letterSpacing: 1.1 }}>
              {tab.label}
            </T>
          </Tap>
        );
      })}
    </View>
  );
}
