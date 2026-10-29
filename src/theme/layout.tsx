import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useWindowDimensions } from 'react-native';
import { typeScale, type TypeScale } from './typography';

export type Breakpoint = 'phone' | 'tablet' | 'desktop';

export interface LayoutInfo {
  width: number;
  height: number;
  bp: Breakpoint;
  isPhone: boolean;
  isDesktop: boolean;
  /** ≥ 768: the top navigation replaces the bottom tab bar */
  topNav: boolean;
  /** run screen splits sky | ground side by side */
  splitRun: boolean;
  gutter: number;
  maxWidth: number;
  type: TypeScale;
}

const LayoutContext = createContext<LayoutInfo | null>(null);

export function computeLayout(width: number, height: number): LayoutInfo {
  const bp: Breakpoint = width < 640 ? 'phone' : width < 1024 ? 'tablet' : 'desktop';
  return {
    width,
    height,
    bp,
    isPhone: bp === 'phone',
    isDesktop: bp === 'desktop',
    topNav: width >= 768,
    splitRun: width >= 900 || (width > height && height < 560),
    gutter: width < 640 ? 20 : width < 1024 ? 32 : width < 1440 ? 48 : 64,
    maxWidth: 1360,
    type: typeScale(width),
  };
}

export function LayoutProvider({ children }: { children: ReactNode }) {
  const { width, height } = useWindowDimensions();
  const value = useMemo(() => computeLayout(width, height), [width, height]);
  return <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>;
}

export function useLayout(): LayoutInfo {
  const value = useContext(LayoutContext);
  if (!value) throw new Error('useLayout must be used inside <LayoutProvider>');
  return value;
}
