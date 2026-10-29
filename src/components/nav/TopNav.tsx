import { usePathname, type Href } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBackend } from '@/backend/BackendProvider';
import { num } from '@/lib/format';
import { useGame } from '@/stores/game';
import { usePreviewSheet, useScrollFlag } from '@/stores/ui';
import { useLayout } from '@/theme/layout';
import { useLight } from '@/theme/LightProvider';
import { dur, ease } from '@/theme/motion';
import { Logo } from '../brand/Logo';
import { Avatar } from '../profile/Avatar';
import { LiveDot } from '../ui/bits';
import { Tap } from '../ui/Tap';
import { T } from '../ui/Text';

export const TOP_NAV_HEIGHT = 76;

const LINKS: { href: Href; label: string; match: (path: string) => boolean }[] = [
  { href: '/', label: 'Today', match: (p) => p === '/' || p.startsWith('/competition') },
  { href: '/standings', label: 'Standings', match: (p) => p.startsWith('/standings') || p.startsWith('/results') },
  { href: '/champions', label: 'Champions', match: (p) => p.startsWith('/champions') },
  { href: '/rules', label: 'Rules', match: (p) => p.startsWith('/rules') },
];

/** Desktop and tablet navigation. Transparent over the hero, solid once the page moves. */
export function TopNav() {
  const light = useLight();
  const { gutter, maxWidth, isDesktop } = useLayout();
  const insets = useSafeAreaInsets();
  const path = usePathname();
  const scrolled = useScrollFlag((s) => s.scrolled);
  const day = useGame((s) => s.day);
  const profile = useGame((s) => s.profile);
  const backend = useBackend();
  const openPreview = usePreviewSheet((s) => s.setOpen);
  const solid = useSharedValue(0);
  useEffect(() => {
    solid.value = withTiming(scrolled ? 1 : 0, { duration: dur.base, easing: ease.out });
  }, [scrolled, solid]);
  const bar = useAnimatedStyle(() => ({ opacity: solid.value }));

  return (
    <View
      role="navigation"
      aria-label="Main"
      style={{ position: 'absolute', top: 0, left: 0, right: 0, paddingTop: insets.top, zIndex: 20 }}
    >
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: light.field, borderBottomWidth: 1, borderBottomColor: light.line }, bar]}
      />
      <View
        style={{
          height: TOP_NAV_HEIGHT,
          paddingHorizontal: gutter,
          width: '100%',
          maxWidth: maxWidth + gutter * 2,
          alignSelf: 'center',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 24,
        }}
      >
        <Tap href="/" accessibilityRole="link" accessibilityLabel="Meridian, today" style={{ paddingVertical: 8 }}>
          <Logo size={15} />
        </Tap>
        <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'center', gap: isDesktop ? 8 : 2 }}>
          {LINKS.map((l) => (
            <NavLink key={l.label} href={l.href} label={l.label} active={l.match(path)} />
          ))}
        </View>
        {isDesktop && day ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }} accessible accessibilityLabel={`${day.liveNow} players live now`}>
            <LiveDot size={7} />
            <T v="label">{num(day.liveNow)} live</T>
          </View>
        ) : null}
        {backend.preview ? (
          <Tap
            onPress={() => openPreview(true)}
            accessibilityRole="button"
            accessibilityLabel="Open preview controls"
            style={({ hovered }) => ({
              height: 34,
              paddingHorizontal: 14,
              borderRadius: 999,
              justifyContent: 'center',
              borderWidth: 1.5,
              borderColor: hovered ? light.sun : light.line,
            })}
          >
            <T v="label">Preview</T>
          </Tap>
        ) : null}
        {profile ? (
          <Tap
              href="/you"
              accessibilityRole="link"
              accessibilityLabel={`You: @${profile.handle}`}
              style={({ hovered }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                paddingLeft: 4,
                paddingRight: isDesktop ? 14 : 4,
                height: 40,
                borderRadius: 999,
                backgroundColor: hovered || path.startsWith('/you') ? light.raised : 'transparent',
              })}
            >
              <Avatar seed={profile.avatarSeed} size={32} />
              {isDesktop ? <T v="label">@{profile.handle}</T> : null}
            </Tap>
        ) : null}
      </View>
    </View>
  );
}

function NavLink({ href, label, active }: { href: Href; label: string; active: boolean }) {
  const light = useLight();
  const on = useSharedValue(active ? 1 : 0);
  useEffect(() => {
    on.value = withTiming(active ? 1 : 0, { duration: dur.base, easing: ease.out });
  }, [active, on]);
  const dot = useAnimatedStyle(() => ({ opacity: on.value, transform: [{ scale: 0.4 + on.value * 0.6 }] }));
  return (
      <Tap
        href={href}
        accessibilityRole="link"
        accessibilityState={{ selected: active }}
        aria-current={active ? 'page' : undefined}
        style={{ paddingHorizontal: 14, height: 44, alignItems: 'center', justifyContent: 'center' }}
      >
        {({ hovered }) => (
          <>
            <T v="label" color={active || hovered ? light.ink : light.muted}>
              {label}
            </T>
            <Animated.View style={[{ position: 'absolute', bottom: 4, width: 5, height: 5, borderRadius: 3, backgroundColor: light.sun }, dot]} />
          </>
        )}
      </Tap>
  );
}
