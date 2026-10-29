import { PixelRatio, Platform, type TextStyle } from 'react-native';

/**
 * Big Shoulders — condensed display numerals for a game made of numbers.
 * Atkinson Hyperlegible Next — designed to be read at a glance; questions get three seconds.
 * Atkinson Hyperlegible Mono — labels, clocks and data.
 */
export const FONTS = {
  thin: 'BigShoulders_100Thin',
  light: 'BigShoulders_300Light',
  bold: 'BigShoulders_700Bold',
  extra: 'BigShoulders_800ExtraBold',
  black: 'BigShoulders_900Black',
  text: 'AtkinsonHyperlegibleNext_400Regular',
  textSemi: 'AtkinsonHyperlegibleNext_600SemiBold',
  textBold: 'AtkinsonHyperlegibleNext_700Bold',
  mono: 'AtkinsonHyperlegibleMono_400Regular',
  monoSemi: 'AtkinsonHyperlegibleMono_600SemiBold',
} as const;

export type TypeVariant =
  | 'hero'
  | 'xl'
  | 'l'
  | 'm'
  | 's'
  | 'numeral'
  | 'question'
  | 'title'
  | 'bodyL'
  | 'body'
  | 'bodyS'
  | 'label'
  | 'mono';

export type TypeScale = Record<TypeVariant, TextStyle>;

/** Linear interpolation of a size between a phone (360) and a wide desktop (1440). */
export function fluid(width: number, min: number, max: number, minW = 360, maxW = 1440): number {
  const t = Math.min(1, Math.max(0, (width - minW) / (maxW - minW)));
  return Math.round(min + (max - min) * t);
}

const androidText: TextStyle = Platform.OS === 'android' ? { includeFontPadding: false } : {};

/** Ascent + descent in ems (hhea): Big Shoulders 0.986 + 0.214, Atkinson 0.984 + 0.316. */
function naturalLeading(fontFamily: string | undefined): number {
  return fontFamily?.startsWith('Atkinson') ? 1.3 : 1.2;
}

const num = (...values: unknown[]): number => {
  for (const v of values) if (typeof v === 'number') return v;
  return 0;
};

/**
 * How far a line's glyphs reach past a line box tighter than the font
 * (Big Shoulders numerals are set at 0.86–1.0). The web centres them in the
 * box and lets them spill; native text views clip whatever spills, and iOS
 * also sits the line on its descent, so the tops of the numbers get cut off.
 */
export function glyphOverhang(style: TextStyle | null | undefined): number {
  if (Platform.OS === 'web' || !style) return 0;
  const { fontSize, lineHeight } = style;
  if (typeof fontSize !== 'number' || typeof lineHeight !== 'number') return 0;
  const half = ((fontSize * naturalLeading(style.fontFamily) - lineHeight) / 2) * PixelRatio.getFontScale();
  return half > 0.5 ? half : 0;
}

/**
 * Upper bound on the width of a number set in Big Shoulders ExtraBold. Its
 * figures are proportional (0.28–0.52 em), so tabular-nums can't line up a
 * column; size the column to its longest number instead.
 */
export function numeralWidth(label: string, fontSize: number): number {
  let em = 0;
  for (const ch of label) em += ch === ',' || ch === '.' ? 0.27 : ch === '+' || ch === '−' ? 0.55 : 0.52;
  return Math.ceil(em * fontSize * PixelRatio.getFontScale());
}

/**
 * Padding that gives tightly-set text room to draw on native, with negative
 * margins that keep its layout box exactly where it was. On iOS the extra
 * room goes on top, which also lowers the baseline to where the web puts it.
 * Pass the flattened style; existing paddings, margins and height are kept.
 */
export function glyphRoom(style: TextStyle | null | undefined): TextStyle | null {
  const half = glyphOverhang(style);
  if (!style || !half) return null;
  const top = Platform.OS === 'ios' ? half * 2 : half;
  const bottom = Platform.OS === 'ios' ? 0 : half;
  return {
    paddingTop: num(style.paddingTop, style.paddingVertical, style.padding) + top,
    paddingBottom: num(style.paddingBottom, style.paddingVertical, style.padding) + bottom,
    marginTop: num(style.marginTop, style.marginVertical, style.margin) - half,
    marginBottom: num(style.marginBottom, style.marginVertical, style.margin) - half,
    ...(typeof style.height === 'number' ? { height: style.height + top + bottom } : null),
  };
}

function display(fontFamily: string, size: number, leading: number, tracking = 0): TextStyle {
  return {
    fontFamily,
    fontSize: size,
    lineHeight: Math.round(size * leading),
    letterSpacing: size * tracking,
    ...androidText,
  };
}

export function typeScale(width: number): TypeScale {
  return {
    hero: display(FONTS.black, fluid(width, 116, 300), 0.86, -0.012),
    xl: display(FONTS.extra, fluid(width, 58, 136), 0.9, -0.006),
    l: display(FONTS.bold, fluid(width, 40, 76), 0.94),
    m: display(FONTS.bold, fluid(width, 28, 44), 1.0),
    s: display(FONTS.bold, fluid(width, 21, 28), 1.06),
    numeral: { ...display(FONTS.extra, fluid(width, 30, 44), 1.0), fontVariant: ['tabular-nums'] },
    question: { fontFamily: FONTS.textBold, fontSize: fluid(width, 25, 40), lineHeight: Math.round(fluid(width, 25, 40) * 1.18), ...androidText },
    title: { fontFamily: FONTS.textSemi, fontSize: fluid(width, 18, 22), lineHeight: Math.round(fluid(width, 18, 22) * 1.3), ...androidText },
    bodyL: { fontFamily: FONTS.text, fontSize: fluid(width, 17, 20), lineHeight: Math.round(fluid(width, 17, 20) * 1.5), ...androidText },
    body: { fontFamily: FONTS.text, fontSize: 16, lineHeight: 24, ...androidText },
    bodyS: { fontFamily: FONTS.text, fontSize: 14, lineHeight: 20, ...androidText },
    label: {
      fontFamily: FONTS.monoSemi,
      fontSize: fluid(width, 11, 12),
      lineHeight: 16,
      letterSpacing: 1.4,
      textTransform: 'uppercase',
      ...androidText,
    },
    mono: { fontFamily: FONTS.mono, fontSize: 13, lineHeight: 18, fontVariant: ['tabular-nums'], ...androidText },
  };
}
