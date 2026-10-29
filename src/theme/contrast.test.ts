import { describe, expect, it } from 'vitest';
import { GROUND, LIGHTS, SIGNAL } from './palette';

function luminance(hex: string): number {
  const n = parseInt(hex.replace('#', ''), 16);
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe('colour contrast (WCAG AA, 4.5:1)', () => {
  for (const light of Object.values(LIGHTS)) {
    it(`${light.label}: text is legible on every surface`, () => {
      for (const bg of [light.field, light.deep, light.raised]) {
        expect(contrast(light.ink, bg), `ink on ${bg}`).toBeGreaterThanOrEqual(4.5);
        expect(contrast(light.muted, bg), `muted on ${bg}`).toBeGreaterThanOrEqual(4.5);
      }
      expect(contrast(light.onSun, light.sun), 'text on the sun').toBeGreaterThanOrEqual(4.5);
      for (const bg of [light.field, light.raised]) {
        expect(contrast(light.sunText, bg), `sun-coloured text on ${bg}`).toBeGreaterThanOrEqual(4.5);
      }
    });
  }

  it('the run ground and feedback fills are legible', () => {
    for (const bg of [GROUND.field, GROUND.raised, GROUND.hover]) {
      expect(contrast(GROUND.ink, bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(GROUND.muted, bg)).toBeGreaterThanOrEqual(4.5);
    }
    expect(contrast(SIGNAL.onCorrect, SIGNAL.correct)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(SIGNAL.onWrong, SIGNAL.wrong)).toBeGreaterThanOrEqual(4.5);
  });
});
