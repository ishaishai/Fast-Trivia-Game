import { router, useIsFocused } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Extrapolation, interpolate, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLayout } from '@/theme/layout';
import { useLight } from '@/theme/LightProvider';
import { ScrollScene } from '../motion/ScrollScene';
import { useTabBarSpace } from '../nav/TabBar';
import { TOP_NAV_HEIGHT, TopNav } from '../nav/TopNav';
import { WorldBackdrop } from '../sky/World';
import { Button } from './Button';

/** A scrolling page painted in the current light, clear of the navigation. */
export function Page({
  children,
  flush,
  bottomPad = 48,
  nav,
  overlay,
}: {
  children: ReactNode;
  flush?: boolean;
  bottomPad?: number;
  /** Screens outside the tabs bring their own navigation: the top bar, or a way back on phones. */
  nav?: boolean;
  /** pinned above the content (and above the tab bar), e.g. your own rank */
  overlay?: ReactNode;
}) {
  const light = useLight();
  const { topNav } = useLayout();
  const insets = useSafeAreaInsets();
  const tabBar = useTabBarSpace();
  // A page in its own light (results at midnight) needs a status bar that reads on it.
  const focused = useIsFocused();
  const scrollY = useSharedValue(0);
  const backdrop = useAnimatedStyle(() => ({ opacity: interpolate(scrollY.value, [0, insets.top], [0, 1], Extrapolation.CLAMP) }));
  return (
    <View style={{ flex: 1, backgroundColor: light.field, overflow: 'hidden' }} role="main">
      {focused ? <StatusBar style={light.statusBar} /> : null}
      <WorldBackdrop />
      <ScrollScene
        scrollY={scrollY}
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: flush ? 0 : topNav ? TOP_NAV_HEIGHT + insets.top + 24 : insets.top + 20,
          paddingBottom: bottomPad + (tabBar || (nav ? insets.bottom : 0)),
        }}
      >
        {nav && !topNav ? (
          <Container style={{ paddingBottom: 8 }}>
            <Button
              label="Back"
              variant="ink"
              size="s"
              iconLeft="arrow-left"
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            />
          </Container>
        ) : null}
        {children}
      </ScrollScene>
      {/* Phones have no top bar: once the page moves, give the status bar a ground so numbers don't scroll under the clock. */}
      {!topNav && insets.top > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top, backgroundColor: light.sky[0] }, backdrop]}
        />
      ) : null}
      {overlay}
      {nav && topNav ? <TopNav /> : null}
    </View>
  );
}

/** Centres content to the grid's max width with the current gutter. */
export function Container({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { gutter, maxWidth } = useLayout();
  return <View style={[{ width: '100%', maxWidth: maxWidth + gutter * 2, alignSelf: 'center', paddingHorizontal: gutter }, style]}>{children}</View>;
}
