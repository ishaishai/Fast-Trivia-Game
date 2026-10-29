#!/usr/bin/env node
/**
 * Generates every binary asset Meridian ships with — no design tools, no
 * dependencies. PNGs are rasterised with 4×4 supersampling; sounds are
 * synthesised into 16-bit mono WAV.
 *
 *   node scripts/generate-assets.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = (p) => join(root, 'assets', p);
mkdirSync(out('sounds'), { recursive: true });

// ---------------------------------------------------------------- PNG ------

const CRC_TABLE = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function encodePng(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const hex = (h, a = 1) => {
  const n = parseInt(h.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, a];
};

/**
 * Paint a list of shapes (back to front). Each shape: { test(x, y) => bool, color }.
 * `background` may be null for transparency.
 */
function paint(width, height, background, shapes, ss = 4) {
  const rgba = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const px = x + (sx + 0.5) / ss;
          const py = y + (sy + 0.5) / ss;
          let cr = 0, cg = 0, cb = 0, ca = 0;
          if (background) [cr, cg, cb, ca] = background;
          for (const s of shapes) {
            if (!s.test(px, py)) continue;
            const [sr, sg, sb, sa] = s.color;
            const outA = sa + ca * (1 - sa);
            if (outA > 0) {
              cr = (sr * sa + cr * ca * (1 - sa)) / outA;
              cg = (sg * sa + cg * ca * (1 - sa)) / outA;
              cb = (sb * sa + cb * ca * (1 - sa)) / outA;
            }
            ca = outA;
          }
          r += cr * ca; g += cg * ca; b += cb * ca; a += ca;
        }
      }
      const n = ss * ss;
      const i = (y * width + x) * 4;
      const alpha = a / n;
      rgba[i] = alpha > 0 ? Math.round(r / a) : 0;
      rgba[i + 1] = alpha > 0 ? Math.round(g / a) : 0;
      rgba[i + 2] = alpha > 0 ? Math.round(b / a) : 0;
      rgba[i + 3] = Math.round(alpha * 255);
    }
  }
  return rgba;
}

const circle = (cx, cy, r, color) => ({ test: (x, y) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r, color });
const rect = (x0, y0, x1, y1, color) => ({ test: (x, y) => x >= x0 && x <= x1 && y >= y0 && y <= y1, color });

const BLUE_HOUR = { field: '#1E1C5E', sun: '#FF7759', ink: '#FFEDE3' };

/** The Meridian mark: a sun crossed by the meridian. `s` is the canvas size, `k` the mark scale. */
function mark(s, k, colors, cy = s / 2) {
  const r = s * 0.29 * k;
  const w = Math.max(2, s * 0.028 * k);
  return [
    circle(s / 2, cy, r, hex(colors.sun)),
    rect(s / 2 - w / 2, cy - s * 0.38 * k, s / 2 + w / 2, cy + s * 0.38 * k, hex(colors.ink)),
  ];
}

function writePng(name, width, height, background, shapes, ss) {
  writeFileSync(out(name), encodePng(width, height, paint(width, height, background, shapes, ss)));
  console.log('  png', name);
}

console.log('Brand images');
writePng('icon.png', 1024, 1024, hex(BLUE_HOUR.field), mark(1024, 1, BLUE_HOUR));
writePng('android-icon-background.png', 512, 512, hex(BLUE_HOUR.field), []);
writePng('android-icon-foreground.png', 1024, 1024, null, mark(1024, 0.72, BLUE_HOUR));
writePng('android-icon-monochrome.png', 1024, 1024, null, mark(1024, 0.72, { sun: '#FFFFFF', ink: '#FFFFFF' }));
writePng('splash-icon.png', 512, 512, null, mark(512, 1.1, BLUE_HOUR));
writePng('favicon.png', 64, 64, hex(BLUE_HOUR.field), mark(64, 1.15, BLUE_HOUR), 6);
writePng('og.png', 1200, 630, hex(BLUE_HOUR.field), [
  circle(900, 400, 300, hex(BLUE_HOUR.sun)),
  rect(897, 40, 903, 630, hex(BLUE_HOUR.ink)),
  rect(0, 470, 1200, 472, hex(BLUE_HOUR.ink, 0.5)),
], 2);

// Film grain: transparent tile of faint light and dark specks.
{
  const size = 160;
  const rgba = Buffer.alloc(size * size * 4);
  let seed = 7;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < size * size; i++) {
    const light = rnd() > 0.5;
    const v = light ? 255 : 0;
    rgba[i * 4] = v;
    rgba[i * 4 + 1] = v;
    rgba[i * 4 + 2] = v;
    rgba[i * 4 + 3] = Math.floor(rnd() ** 2 * 34);
  }
  writeFileSync(out('grain.png'), encodePng(size, size, rgba));
  console.log('  png grain.png');
}

// ---------------------------------------------------------------- WAV ------

const RATE = 22050;
function writeWav(name, samples) {
  const data = Buffer.alloc(samples.length * 2);
  let peak = 0;
  for (const s of samples) peak = Math.max(peak, Math.abs(s));
  const norm = peak > 0 ? 0.82 / peak : 1;
  samples.forEach((s, i) => data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, s * norm)) * 32767), i * 2));
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  writeFileSync(out(`sounds/${name}.wav`), Buffer.concat([header, data]));
  console.log('  wav', name);
}

const len = (sec) => Math.round(sec * RATE);
const silence = (sec) => new Float32Array(len(sec));

/** A bell-ish tone: fundamental + soft partials, exponential decay, short attack. */
function bell(freq, sec, { decay = 6, attack = 0.004, partials = [1, 0.35, 0.12] } = {}) {
  const n = len(sec);
  const outBuf = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    const env = Math.min(1, t / attack) * Math.exp(-decay * t);
    let v = 0;
    partials.forEach((amp, k) => { v += amp * Math.sin(2 * Math.PI * freq * (k + 1) * t); });
    outBuf[i] = v * env;
  }
  return outBuf;
}

function glide(f0, f1, sec, { decay = 4 } = {}) {
  const n = len(sec);
  const outBuf = new Float32Array(n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    const f = f0 * Math.pow(f1 / f0, t / sec);
    phase += (2 * Math.PI * f) / RATE;
    const env = Math.min(1, t / 0.01) * Math.exp(-decay * t);
    outBuf[i] = (Math.sin(phase) + 0.25 * Math.sin(2 * phase)) * env;
  }
  return outBuf;
}

function noise(sec, { lowpass = 0.2, attack = 0.02, release = 0.12, seed = 1 } = {}) {
  const n = len(sec);
  const outBuf = new Float32Array(n);
  let s = seed;
  let y = 0;
  for (let i = 0; i < n; i++) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const white = s / 2147483648 - 1;
    const t = i / RATE;
    const k = typeof lowpass === 'function' ? lowpass(t / sec) : lowpass;
    y += k * (white - y);
    const env = Math.min(1, t / attack) * Math.min(1, (sec - t) / release);
    outBuf[i] = y * env;
  }
  return outBuf;
}

/** Mix several buffers, each offset in seconds and scaled. */
function mix(parts, total) {
  const outBuf = new Float32Array(len(total));
  for (const [buf, at, gain = 1] of parts) {
    const o = len(at);
    for (let i = 0; i < buf.length && o + i < outBuf.length; i++) outBuf[o + i] += buf[i] * gain;
  }
  return outBuf;
}

const NOTE = { C4: 261.63, G4: 392, C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880, C6: 1046.5, D6: 1174.66, E6: 1318.51 };

console.log('UI sounds');
writeWav('tap', noise(0.025, { lowpass: 0.5, attack: 0.001, release: 0.02, seed: 3 }));
writeWav('tick', bell(1760, 0.06, { decay: 60, partials: [1] }));
writeWav('correct', mix([[bell(NOTE.A5, 0.25, { decay: 14 }), 0], [bell(NOTE.E6, 0.32, { decay: 10 }), 0.07, 0.9]], 0.4));
writeWav('wrong', mix([[glide(150, 90, 0.2, { decay: 12 }), 0], [noise(0.06, { lowpass: 0.08, seed: 9 }), 0, 0.5]], 0.22));
writeWav('silent', glide(660, 300, 0.34, { decay: 5 }));
writeWav('skip', noise(0.22, { lowpass: (p) => 0.03 + 0.25 * Math.sin(Math.PI * p), attack: 0.05, release: 0.12, seed: 5 }));
writeWav('open', mix([[bell(NOTE.G5, 0.5, { decay: 5 }), 0], [bell(NOTE.D6, 0.6, { decay: 4 }), 0.12, 0.8]], 0.75));
writeWav('sunrise', mix([
  [bell(NOTE.C5, 0.7, { decay: 3 }), 0, 0.7],
  [bell(NOTE.E5, 0.7, { decay: 3 }), 0.8, 0.7],
  [bell(NOTE.G5, 0.7, { decay: 3 }), 1.6, 0.8],
], 2.4));
writeWav('sunset', mix([
  [bell(NOTE.G4, 1.4, { decay: 1.8, partials: [1, 0.5, 0.2, 0.1] }), 0, 0.8],
  [bell(NOTE.C4, 1.6, { decay: 1.5, partials: [1, 0.5, 0.2, 0.1] }), 0.18, 0.9],
], 1.8));
writeWav('crown', mix([
  [bell(NOTE.C5, 0.9, { decay: 3 }), 0, 0.7],
  [bell(NOTE.E5, 0.9, { decay: 3 }), 0.09, 0.7],
  [bell(NOTE.G5, 0.9, { decay: 3 }), 0.18, 0.7],
  [bell(NOTE.C6, 1.0, { decay: 2.5 }), 0.27, 0.8],
  [bell(NOTE.E6, 1.1, { decay: 2.2 }), 0.36, 0.6],
  [noise(0.9, { lowpass: 0.6, attack: 0.3, release: 0.5, seed: 11 }), 0.2, 0.04],
], 1.5));
void silence;
console.log('Done.');
