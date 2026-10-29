import type { LightState } from '@shared/types';

/**
 * Meridian's identity is lit by the time of day. Every screen is painted in
 * one light state; runs travel through all four, sunrise to midnight.
 */
export interface Light {
  name: LightState;
  label: string;
  /** page background */
  field: string;
  /** recessed surfaces and the shadow side of things */
  deep: string;
  /** raised surfaces: panels, rows, inputs */
  raised: string;
  /** the sun (or the moon, at midnight) — accents, primary actions, focus */
  sun: string;
  /** text on the sun */
  onSun: string;
  /** the sun's colour when it is used for text (darkened where the sky is pale) */
  sunText: string;
  ink: string;
  muted: string;
  line: string;
  glow: string;
  statusBar: 'light' | 'dark';
}

export const LIGHTS: Record<LightState, Light> = {
  firstlight: {
    name: 'firstlight',
    label: 'First Light',
    field: '#CFE4EE',
    deep: '#A9CFDF',
    raised: '#E3F0F5',
    sun: '#FF5B35',
    onSun: '#0F1B2A',
    sunText: '#B23A12',
    ink: '#0F1B2A',
    muted: '#3E5468',
    line: 'rgba(15, 27, 42, 0.16)',
    glow: 'rgba(255, 91, 53, 0.32)',
    statusBar: 'dark',
  },
  zenith: {
    name: 'zenith',
    label: 'Zenith',
    field: '#2D48F5',
    deep: '#1F34C9',
    raised: '#2541E6',
    sun: '#FFE85A',
    onSun: '#0F1B2A',
    sunText: '#FFE85A',
    ink: '#FFFFFF',
    muted: '#D6DDFF',
    line: 'rgba(255, 255, 255, 0.22)',
    glow: 'rgba(255, 232, 90, 0.34)',
    statusBar: 'light',
  },
  bluehour: {
    name: 'bluehour',
    label: 'Blue Hour',
    field: '#1E1C5E',
    deep: '#15134A',
    raised: '#29276F',
    sun: '#FF7759',
    onSun: '#1E1C5E',
    sunText: '#FF7759',
    ink: '#FFEDE3',
    muted: '#B9B3E6',
    line: 'rgba(255, 237, 227, 0.16)',
    glow: 'rgba(255, 119, 89, 0.34)',
    statusBar: 'light',
  },
  midnight: {
    name: 'midnight',
    label: 'Midnight',
    field: '#0C0D24',
    deep: '#07081A',
    raised: '#16183A',
    sun: '#E6E9FF',
    onSun: '#0C0D24',
    sunText: '#E6E9FF',
    ink: '#EEF0FF',
    muted: '#8C90C4',
    line: 'rgba(238, 240, 255, 0.14)',
    glow: 'rgba(230, 233, 255, 0.24)',
    statusBar: 'light',
  },
};

/** The order a run travels through: sunrise to midnight. */
export const LIGHT_ORDER: LightState[] = ['firstlight', 'zenith', 'bluehour', 'midnight'];

/** The run's ground never changes, so questions always read the same way. */
export const GROUND = {
  field: '#0B0C1C',
  raised: '#17192E',
  hover: '#20233F',
  ink: '#F3F4FF',
  muted: '#9EA3CF',
  line: 'rgba(243, 244, 255, 0.12)',
};

/** Feedback is never colour alone: always paired with ✓ / ✕ and +3 / −1. */
export const SIGNAL = {
  correct: '#1FD17A',
  onCorrect: '#04210F',
  wrong: '#FF4D4D',
  onWrong: '#2A0606',
};
