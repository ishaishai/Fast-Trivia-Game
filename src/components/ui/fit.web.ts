import { useLayoutEffect, useRef } from 'react';
import type { TextProps, TextStyle } from 'react-native';

export function fitProps(min: number | undefined): Partial<TextProps> | null {
  return min ? { numberOfLines: 1 } : null;
}

/**
 * The web has no adjustsFontSizeToFit: measure the line at its full size and
 * scale the type down (to `min` of it) until it fits the width it was given.
 * Below `min` it falls back to an ellipsis.
 */
export function useFitText<R>(min: number | undefined, style: TextStyle | null | undefined, content: string) {
  const ref = useRef<R>(null);
  const { fontSize, lineHeight, letterSpacing } = style ?? {};
  useLayoutEffect(() => {
    const el = ref.current as unknown as HTMLElement | null;
    if (!min || !el || typeof fontSize !== 'number') return;
    const size = (scale: number) => {
      el.style.fontSize = `${fontSize * scale}px`;
      if (typeof lineHeight === 'number') el.style.lineHeight = `${lineHeight * scale}px`;
      if (typeof letterSpacing === 'number') el.style.letterSpacing = `${letterSpacing * scale}px`;
    };
    const fit = () => {
      size(1);
      if (el.scrollWidth <= el.clientWidth) return;
      size(Math.max(min, (el.clientWidth - 1) / el.scrollWidth));
    };
    fit();
    // Refit when the room changes, not when our own resizing nudges the height.
    let width = -1;
    const observer = new ResizeObserver(([entry]) => {
      if (Math.abs(entry.contentRect.width - width) < 0.5) return;
      width = entry.contentRect.width;
      fit();
    });
    observer.observe(el.parentElement ?? el);
    return () => observer.disconnect();
  }, [min, fontSize, lineHeight, letterSpacing, content]);
  return ref;
}
