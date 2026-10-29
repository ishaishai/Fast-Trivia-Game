import type { RefObject } from 'react';
import type { TextProps, TextStyle } from 'react-native';

/** One line that scales itself down to fit (to `min` of its size) instead of being cut short. */
export function fitProps(min: number | undefined): Partial<TextProps> | null {
  return min ? { numberOfLines: 1, adjustsFontSizeToFit: true, minimumFontScale: min } : null;
}

/** Native text fits itself (see `fitProps`); only the web needs a hand. */
export function useFitText<R>(_min: number | undefined, _style: TextStyle | null | undefined, _content: string): RefObject<R | null> | undefined {
  return undefined;
}
