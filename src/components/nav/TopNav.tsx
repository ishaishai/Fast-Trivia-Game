import { usePathname, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBackend } from '@/backend/BackendProvider';
import { useGame } from '@/stores/game';
import { usePreviewSheet } from '@/stores/ui';
import { useLayout } from '@/theme/layout';
import { CardScope, useLight } from '@/theme/LightProvider';
import { WHITE } from '@/theme/palette';
import { Logo } from '../brand/Logo';
import { Icon, type IconName } from '../icons';
import { useSquish } from '../motion/Playful';
import { Avatar } from '../profile/Avatar';
import { Tap } from '../ui/Tap';
import { T } from '../ui/Text';

export const TOP_NAV_HEIGHT = 76;

const LINKS: { href: Href; label: string; icon: IconName; match: (path: string) => boolean }[] = [
  { href: '/', label: 'Play', icon: 'play', match: (p) => p === '/' || p.startsWith('/competition') },
  { href: '/standings', label: 'Ranks', icon: 'trophy', match: (p) => p.startsWith('/standings') || p.startsWith('/results') || p.startsWith('/champions') },
  { href: '/rules', label: 'How to play', icon: 'help', match: (p) => p.startsWith('/rules') },
];

/** Tablet and desktop navigation: a white bar floating over the sky. */
export function TopNav() {
  const light = useLight();
  const { gutter, maxWidth, isDesktop } = useLayout();
  const insets = useSafeAreaInsets();
  const path = usePathname();
  const profile = useGame((s) => s.profile);
  const backend = useBackend();
  const openPreview = usePreviewSheet((s) => s.setOpen);

  return (
    <View role="navigation" aria-label="Main" pointerEvents="box-none" style={{ position: 'absolute', top: 0, left: 0, right: 0, paddingTop: insets.top + 10, zIndex: 20 }}>
      <View style={{ paddingHorizontal: gutter, width: '100%', maxWidth: maxWidth + gutter * 2, alignSelf: 'center' }}>
        <View
          style={{
            height: TOP_NAV_HEIGHT - 16,
            paddingHorizontal: 14,
            borderRadius: 24,
            backgroundColor: WHITE,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 16,
            boxShadow: `0px 5px 0px 0px ${light.shadow}, 0px 14px 28px -12px ${light.shadow}`,
          }}
        >
          <CardScope>
            <Tap href="/" accessibilityRole="link" accessibilityLabel="Meridian, play" style={{ paddingVertical: 6, borderRadius: 12 }}>
              <Logo size={15} />
            </Tap>
            <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'center', gap: isDesktop ? 8 : 4 }}>
              {LINKS.map((l) => (
                <NavLink key={l.label} href={l.href} label={l.label} icon={l.icon} active={l.match(path)} />
              ))}
            </View>
            {backend.preview ? (
              <Tap
                onPress={() => openPreview(true)}
                accessibilityRole="button"
                accessibilityLabel="Open preview controls"
                style={({ hovered }) => ({
                  height: 36,
                  paddingHorizontal: 14,
                  borderRadius: 999,
                  justifyContent: 'center',
                  backgroundColor: hovered ? light.card.deep : light.card.raised,
                })}
              >
                <T v="label">Preview</T>
              </Tap>
            ) : null}
            {profile ? (
              <Tap
                href="/you"
                accessibilityRole="link"
                accessibilityLabel={`Me: @${profile.handle}`}
                style={({ hovered }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  paddingLeft: 4,
                  paddingRight: isDesktop ? 14 : 4,
                  height: 44,
                  borderRadius: 999,
                  backgroundColor: hovered || path.startsWith('/you') ? light.card.deep : 'transparent',
                })}
              >
                <Avatar seed={profile.avatarSeed} size={36} />
                {isDesktop ? <T v="label">@{profile.handle}</T> : null}
              </Tap>
            ) : null}
          </CardScope>
        </View>
      </View>
    </View>
  );
}

function NavLink({ href, label, icon, active }: { href: Href; label: string; icon: IconName; active: boolean }) {
  const light = useLight();
  return (
    <Tap
      href={href}
      accessibilityRole="link"
      accessibilityState={{ selected: active }}
      aria-current={active ? 'page' : undefined}
      style={{ borderRadius: 16 }}
    >
      {({ hovered, pressed }) => (
        <LinkFace pressed={pressed} bg={active ? light.sun : hovered ? light.card.deep : 'transparent'} lip={active ? light.sunLip : 'transparent'}>
          <Icon name={icon} color={active ? light.onSun : light.card.ink} size={18} strokeWidth={2.4} filled={active && icon !== 'help'} />
          <T v="label" color={active ? light.onSun : light.card.ink} style={{ fontSize: 15 }}>
            {label}
          </T>
        </LinkFace>
      )}
    </Tap>
  );
}

function LinkFace({ pressed, bg, lip, children }: { pressed: boolean; bg: string; lip: string; children: ReactNode }) {
  const squish = useSquish(pressed);
  return (
    <Animated.View
      style={[{ height: 42, paddingHorizontal: 16, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: bg, boxShadow: `0px 3px 0px 0px ${lip}` }, squish]}
    >
      {children}
    </Animated.View>
  );
}
