import type { LightState } from '@shared/types';

/** The colours of one surface: the sky itself, or a card sitting on it. */
export interface Surface {
  /** the surface's own colour */
  field: string;
  /** wells sunk into it: tracks, inputs, counters */
  deep: string;
  /** small things raised on it: rows, chips */
  raised: string;
  ink: string;
  muted: string;
  line: string;
  /** accent-coloured text on this surface */
  sunText: string;
}

export type Decor = 'clouds' | 'rays' | 'sparkles' | 'stars';

/**
 * Meridian is lit by the time of day. Every screen is painted in one of four
 * worlds; runs travel through all of them, sunrise to midnight. Text on the
 * sky uses the light's own ink; anything inside a card switches to `card`
 * (see CardScope).
 */
export interface Light extends Surface {
  name: LightState;
  label: string;
  /** the page gradient, top to bottom. `field` is its solid stand-in (status bar, theme colour). */
  sky: readonly [string, string];
  /** the sun: primary buttons, highlights */
  sun: string;
  /** the darker underside of a sun-coloured button */
  sunLip: string;
  /** text on the sun */
  onSun: string;
  /** keyboard focus ring (paired with a white halo, so it reads on the sky and on cards) */
  focus: string;
  /** tinted drop shadow under cards */
  shadow: string;
  glow: string;
  decor: Decor;
  card: Surface;
  statusBar: 'light' | 'dark';
}

/** Cards are the same everywhere: white, with deep indigo ink. */
export const CARD: Surface = {
  field: '#FFFFFF',
  deep: '#EFEAFB',
  raised: '#F6F3FE',
  ink: '#221B45',
  muted: '#5F587F',
  line: 'rgba(34, 27, 69, 0.12)',
  sunText: '#6A2FD8',
};

const FOCUS = '#221B45';

export const LIGHTS: Record<LightState, Light> = {
  firstlight: {
    name: 'firstlight',
    label: 'Morning',
    sky: ['#FFB8D2', '#A6E1FF'],
    field: '#FFB8D2',
    deep: '#F7A3C4',
    raised: '#FFD3E3',
    sun: '#FFB627',
    sunLip: '#B86A00',
    onSun: '#3D1F00',
    sunText: '#7A2E00',
    ink: '#2A1B4A',
    muted: '#4E3A75',
    line: 'rgba(42, 27, 74, 0.16)',
    focus: FOCUS,
    shadow: 'rgba(122, 48, 110, 0.28)',
    glow: 'rgba(255, 182, 39, 0.45)',
    decor: 'clouds',
    card: CARD,
    statusBar: 'dark',
  },
  zenith: {
    name: 'zenith',
    label: 'Daytime',
    sky: ['#4FB8FF', '#A8E6FF'],
    field: '#4FB8FF',
    deep: '#3FA6F0',
    raised: '#7DCBFF',
    sun: '#FFC83D',
    sunLip: '#B87800',
    onSun: '#3D2500',
    sunText: '#0B2252',
    ink: '#0B2252',
    muted: '#173263',
    line: 'rgba(11, 34, 82, 0.16)',
    focus: FOCUS,
    shadow: 'rgba(10, 60, 140, 0.30)',
    glow: 'rgba(255, 200, 61, 0.5)',
    decor: 'rays',
    card: CARD,
    statusBar: 'dark',
  },
  bluehour: {
    name: 'bluehour',
    label: 'Evening',
    sky: ['#6B3BEA', '#B02A78'],
    field: '#6B3BEA',
    deep: '#5A2CCB',
    raised: '#7445E6',
    sun: '#FFC83D',
    sunLip: '#B87800',
    onSun: '#3D2500',
    sunText: '#FFE9A8',
    ink: '#FFFFFF',
    muted: '#F8E8F8',
    line: 'rgba(255, 255, 255, 0.22)',
    focus: FOCUS,
    shadow: 'rgba(40, 8, 60, 0.40)',
    glow: 'rgba(255, 200, 61, 0.45)',
    decor: 'sparkles',
    card: CARD,
    statusBar: 'light',
  },
  midnight: {
    name: 'midnight',
    label: 'Night',
    sky: ['#191A5C', '#3B2A8F'],
    field: '#191A5C',
    deep: '#121348',
    raised: '#2A2A78',
    sun: '#FFD75E',
    sunLip: '#B88A00',
    onSun: '#3A2600',
    sunText: '#FFD75E',
    ink: '#FFFFFF',
    muted: '#C9C6F2',
    line: 'rgba(255, 255, 255, 0.18)',
    focus: FOCUS,
    shadow: 'rgba(0, 0, 24, 0.50)',
    glow: 'rgba(255, 215, 94, 0.40)',
    decor: 'stars',
    card: CARD,
    statusBar: 'light',
  },
};

/** The order a run travels through: sunrise to midnight. */
export const LIGHT_ORDER: LightState[] = ['firstlight', 'zenith', 'bluehour', 'midnight'];

/** A light seen from inside one of its cards. */
export function surfaceOf(light: Light): Light {
  return { ...light, ...light.card };
}

/**
 * Answer tiles: one colour per position, none of them green or red, so a
 * tile never looks like feedback before it is feedback.
 */
export const TILES: readonly { bg: string; lip: string; fg: string }[] = [
  { bg: '#2F6FE8', lip: '#1C4CB0', fg: '#FFFFFF' },
  { bg: '#8A3FE0', lip: '#6226A8', fg: '#FFFFFF' },
  { bg: '#C42A8A', lip: '#8E1C63', fg: '#FFFFFF' },
  { bg: '#0B7F86', lip: '#055A60', fg: '#FFFFFF' },
];

/** Feedback is never colour alone: always paired with ✓ / ✕ and +3 / −1. */
export const SIGNAL = {
  correct: '#2BD46A',
  correctLip: '#14974A',
  onCorrect: '#05301A',
  wrong: '#FF5A5F',
  wrongLip: '#C8323A',
  onWrong: '#3D0508',
  /** the timer running low */
  warn: '#FF9A1F',
  onWarn: '#3D1A00',
};

export const WHITE = '#FFFFFF';

/** Sunny's own colours, the same in every light. */
export const SUNNY = {
  body: '#FFC83D',
  lip: '#B87800',
  ink: '#3D2500',
  face: '#3A2200',
  cheek: '#FF7FA0',
  tongue: '#FF6F8E',
  crown: '#E09A00',
};

/** Sky decorations: sparkles and the little moon at night. Clouds are WHITE. */
export const DECOR = { sparkle: '#FFF3C4', moon: '#FFE9A8' };

/** The moon that slides over Sunny during each question. */
export const MOON = { face: '#E4DEFF', crater: '#CFC6F2' };

/** Undersides of white and lavender buttons, and the track of a switch that's off. */
export const LIPS = { white: '#D4CCEE', well: '#CBC1EE', track: '#CFC6EC' };

/** Candy swatches for pictures: rule cards, how-to steps, bursts. Icons on them use CARD.ink. */
export const CANDY = {
  sky: { bg: '#4FB8FF', lip: '#2A7FC4' },
  sun: { bg: SUNNY.body, lip: SUNNY.lip },
  mint: { bg: SIGNAL.correct, lip: SIGNAL.correctLip },
  coral: { bg: SIGNAL.wrong, lip: SIGNAL.wrongLip },
  grape: { bg: '#B08CFF', lip: '#7A55D6' },
  bubblegum: { bg: '#FF8FB8', lip: '#D45A88' },
  pink: { bg: '#FF5FA2', lip: '#D43F80' },
};

/** Soft tints behind stats and status pills; CARD.ink reads on all of them. */
export const TINTS = {
  sky: '#BFE3FF',
  butter: '#FFE7A3',
  blush: '#FFD3E3',
  peach: '#FFE1C2',
  /** text on peach, for "too slow" and streaks */
  onPeach: '#7A2E00',
};

/** The podium's three blocks: gold, sky, peach. */
export const PODIUM: readonly { bg: string; lip: string; ink: string }[] = [
  { bg: SUNNY.body, lip: SUNNY.lip, ink: SUNNY.ink },
  { bg: '#BFE3FF', lip: '#6FA8D8', ink: '#0B2252' },
  { bg: '#FFC1A1', lip: '#D9825A', ink: '#4A1A00' },
];

/** Confetti and pixel bursts. */
export const CONFETTI = [SUNNY.body, '#FF5FA2', '#4FB8FF', '#8A3FE0', SIGNAL.correct, SIGNAL.warn];

/** Player faces (Avatar): a colour each, with dark features drawn on top. */
export const FACES = {
  colors: ['#FFC83D', '#4FB8FF', '#FF8FB8', '#2BD46A', '#B08CFF', '#FF9A1F', '#3EDBD0', '#FF5A5F', '#8FD14F', '#6B8BFF'],
  ink: '#2A1B4A',
  cheek: '#FF6F8E',
  sprout: '#2BA84A',
  bow: '#FF5FA2',
  knot: '#E0407F',
};
