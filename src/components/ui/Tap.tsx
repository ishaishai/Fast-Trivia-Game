import { router, type Href } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Platform, Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import { haptic } from '@/audio/haptics';

export interface TapState {
  hovered: boolean;
  pressed: boolean;
  focused: boolean;
}

export interface TapProps extends Omit<PressableProps, 'children' | 'style'> {
  children: ReactNode | ((state: TapState) => ReactNode);
  style?: StyleInput;
  /** light haptic tick on press (native) */
  feel?: boolean;
  /** Navigate on press. On the web it renders a real <a href> (right-click, new tab) with client-side routing. */
  href?: Href;
}

type StyleInput = StyleProp<ViewStyle> | ((state: TapState) => StyleProp<ViewStyle>);

/** Link asChild merges styles into arrays, so a style function can arrive nested. */
function resolveStyle(style: unknown, state: TapState): StyleProp<ViewStyle> {
  if (typeof style === 'function') return (style as (s: TapState) => StyleProp<ViewStyle>)(state);
  if (Array.isArray(style)) return style.map((s) => resolveStyle(s, state)) as StyleProp<ViewStyle>;
  return style as StyleProp<ViewStyle>;
}

/**
 * Pressable with hover and keyboard focus tracked on every platform, a
 * pointer cursor on the web, and an optional haptic tick on touch devices.
 */
export function Tap({ children, style, feel = true, href, onPress, onHoverIn, onHoverOut, onFocus, onBlur, ...rest }: TapProps) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const webHref = Platform.OS === 'web' && typeof href === 'string' ? { href } : null;
  return (
    <Pressable
      {...rest}
      {...(webHref as object)}
      onPress={(e) => {
        if (feel) haptic('select');
        if (href) {
          // Keep it a single-page app: the anchor is for semantics, the router does the navigating.
          (e as unknown as { preventDefault?: () => void }).preventDefault?.();
          router.push(href);
        }
        onPress?.(e);
      }}
      onHoverIn={(e) => {
        setHovered(true);
        onHoverIn?.(e);
      }}
      onHoverOut={(e) => {
        setHovered(false);
        onHoverOut?.(e);
      }}
      onFocus={(e) => {
        setFocused(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        onBlur?.(e);
      }}
      style={({ pressed }) => {
        const resolved = resolveStyle(style, { hovered, pressed, focused });
        return [Platform.OS === 'web' ? ({ cursor: rest.disabled ? 'default' : 'pointer' } as ViewStyle) : null, resolved];
      }}
    >
      {({ pressed }) => (typeof children === 'function' ? children({ hovered, pressed, focused }) : children)}
    </Pressable>
  );
}
