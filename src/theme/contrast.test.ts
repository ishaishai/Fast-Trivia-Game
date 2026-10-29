import { describe, expect, it } from 'vitest';
import { CARD, GROUND, LIGHTS, SIGNAL, TILES } from './palette';

const rgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

function luminance(hex: string): number {
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = rgb(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** A point along a CSS gradient, which mixes in sRGB. */
function mix(a: string, b: string, t: number): string {
  const [x, y] = [rgb(a), rgb(b)];
  return `#${x.map((c, i) => Math.round(c + (y[i] - c) * t).toString(16).padStart(2, '0')).join('')}`;
}

function hue(hex: string): number {
  const [r, g, b] = rgb(hex).map((c) => c / 255);
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  if (!d) return 0;
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}

const AA = 4.5;
/** WCAG 1.4.11: outlines of controls and focus indicators. */
const NON_TEXT = 3;

describe('colour contrast (WCAG AA)', () => {
  for (const light of Object.values(LIGHTS)) {
    it(`${light.label}: text on the sky is legible everywhere along the gradient`, () => {
      const sky = [0, 0.25, 0.5, 0.75, 1].map((t) => mix(light.sky[0], light.sky[1], t));
      for (const bg of [...sky, light.field, light.deep, light.raised]) {
        expect(contrast(light.ink, bg), `ink on ${bg}`).toBeGreaterThanOrEqual(AA);
        expect(contrast(light.muted, bg), `muted on ${bg}`).toBeGreaterThanOrEqual(AA);
      }
      for (const bg of [...sky, light.field, light.raised]) {
        expect(contrast(light.sunText, bg), `sun-coloured text on ${bg}`).toBeGreaterThanOrEqual(AA);
      }
      // Focus is a dark ring inside a white halo: one of the two always stands out.
      for (const bg of [...sky, light.card.field]) {
        expect(Math.max(contrast(light.focus, bg), contrast('#FFFFFF', bg)), `focus on ${bg}`).toBeGreaterThanOrEqual(NON_TEXT);
      }
    });

    it(`${light.label}: buttons read on the sun`, () => {
      expect(contrast(light.onSun, light.sun), 'text on the sun').toBeGreaterThanOrEqual(AA);
      // The lip is what outlines a sun button against a white card.
      expect(contrast(light.sunLip, light.card.field), 'sun lip on a card').toBeGreaterThanOrEqual(NON_TEXT);
    });
  }

  it('cards are legible', () => {
    for (const bg of [CARD.field, CARD.deep, CARD.raised]) {
      expect(contrast(CARD.ink, bg), `ink on ${bg}`).toBeGreaterThanOrEqual(AA);
      expect(contrast(CARD.muted, bg), `muted on ${bg}`).toBeGreaterThanOrEqual(AA);
    }
    for (const bg of [CARD.field, CARD.raised]) {
      expect(contrast(CARD.sunText, bg), `accent text on ${bg}`).toBeGreaterThanOrEqual(AA);
    }
  });

  it('answer tiles are legible and never look like feedback', () => {
    for (const tile of TILES) {
      expect(contrast(tile.fg, tile.bg), `text on ${tile.bg}`).toBeGreaterThanOrEqual(AA);
      const h = hue(tile.bg);
      expect(h >= 85 && h <= 165, `${tile.bg} (hue ${h.toFixed(0)}) reads as green`).toBe(false);
      expect(h >= 345 || h <= 15, `${tile.bg} (hue ${h.toFixed(0)}) reads as red`).toBe(false);
    }
  });

  it('the run ground and feedback fills are legible', () => {
    for (const bg of [GROUND.field, GROUND.raised, GROUND.hover]) {
      expect(contrast(GROUND.ink, bg)).toBeGreaterThanOrEqual(AA);
      expect(contrast(GROUND.muted, bg)).toBeGreaterThanOrEqual(AA);
    }
    expect(contrast(SIGNAL.onCorrect, SIGNAL.correct)).toBeGreaterThanOrEqual(AA);
    expect(contrast(SIGNAL.onWrong, SIGNAL.wrong)).toBeGreaterThanOrEqual(AA);
  });
});
