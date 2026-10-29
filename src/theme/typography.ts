import { PixelRatio, Platform, type TextStyle } from 'react-native';

/**
 * Fredoka — round, chunky and friendly: headings, buttons, numbers, labels.
 * Atkinson Hyperlegible Next — designed to be read at a glance; questions get three seconds.
 */
export const FONTS = {
  display: 'Fredoka_700Bold',
  displaySemi: 'Fredoka_600SemiBold',
  displayMedium: 'Fredoka_500Medium',
  /** numbers; one place to change if they ever get their own face */
  num: 'Fredoka_700Bold',
  text: 'AtkinsonHyperlegibleNext_400Regular',
  textSemi: 'AtkinsonHyperlegibleNext_600SemiBold',
  textBold: 'AtkinsonHyperlegibleNext_700Bold',
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
  | 'mono'
  | 'button';

export type TypeScale = Record<TypeVariant, TextStyle>;

/** Linear interpolation of a size between a phone (360) and a wide desktop (1440). */
export function fluid(width: number, min: number, max: number, minW = 360, maxW = 1440): number {
  const t = Math.min(1, Math.max(0, (width - minW) / (maxW - minW)));
  return Math.round(min + (max - min) * t);
}

const androidText: TextStyle = Platform.OS === 'android' ? { includeFontPadding: false } : {};

/** Ascent + descent in ems (hhea): Fredoka 0.974 + 0.236, Atkinson 0.984 + 0.316. */
function naturalLeading(fontFamily: string | undefined): number {
  return fontFamily?.startsWith('Atkinson') ? 1.3 : 1.21;
}

const num = (...values: unknown[]): number => {
  for (const v of values) if (typeof v === 'number') return v;
  return 0;
};

/**
 * How far a line's glyphs reach past a line box tighter than the font
 * (Fredoka headings are set at 1.04–1.2). The web centres them in the box and
 * lets them spill; native text views clip whatever spills, and iOS also sits
 * the line on its descent, so the tops of the letters get cut off.
 */
export function glyphOverhang(style: TextStyle | null | undefined): number {
  if (Platform.OS === 'web' || !style) return 0;
  const { fontSize, lineHeight } = style;
  if (typeof fontSize !== 'number' || typeof lineHeight !== 'number') return 0;
  const half = ((fontSize * naturalLeading(style.fontFamily) - lineHeight) / 2) * PixelRatio.getFontScale();
  return half > 0.5 ? half : 0;
}

/** Fredoka's widest advance per character, in ems, across the weights we use (hmtx). */
const ADVANCE: Record<string, number> = { ',': 0.23, '.': 0.23, ':': 0.24, '+': 0.53, '−': 0.56, '-': 0.42, '#': 0.77, ' ': 0.25 };

/**
 * Upper bound on the width of a number set in Fredoka. Its figures are
 * proportional (0.38–0.59 em), so tabular-nums can't line up a column; size
 * the column to its longest number instead.
 */
export function numeralWidth(label: string, fontSize: number): number {
  let em = 0;
  for (const ch of label) em += ADVANCE[ch] ?? 0.59;
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

function text(fontFamily: string, size: number, leading: number): TextStyle {
  return { fontFamily, fontSize: size, lineHeight: Math.round(size * leading), ...androidText };
}

export function typeScale(width: number): TypeScale {
  return {
    hero: display(FONTS.display, fluid(width, 52, 104), 1.04, -0.01),
    xl: display(FONTS.display, fluid(width, 38, 68), 1.08, -0.005),
    l: display(FONTS.display, fluid(width, 28, 44), 1.12),
    m: display(FONTS.display, fluid(width, 22, 30), 1.16),
    s: display(FONTS.displaySemi, fluid(width, 18, 22), 1.2),
    numeral: { ...display(FONTS.num, fluid(width, 28, 40), 1.1), fontVariant: ['tabular-nums'] },
    question: text(FONTS.textBold, fluid(width, 23, 36), 1.22),
    title: text(FONTS.displaySemi, fluid(width, 17, 20), 1.25),
    bodyL: text(FONTS.text, fluid(width, 17, 19), 1.45),
    body: { fontFamily: FONTS.text, fontSize: 16, lineHeight: 24, ...androidText },
    bodyS: { fontFamily: FONTS.text, fontSize: 14, lineHeight: 20, ...androidText },
    label: { fontFamily: FONTS.displaySemi, fontSize: fluid(width, 13, 14), lineHeight: 18, letterSpacing: 0.2, ...androidText },
    mono: { fontFamily: FONTS.displayMedium, fontSize: 13, lineHeight: 18, fontVariant: ['tabular-nums'], ...androidText },
    button: text(FONTS.display, 17, 1.25),
  };
}
