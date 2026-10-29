#!/usr/bin/env node
/**
 * After `expo export --platform web`: give dist/index.html the things a
 * single-page export can't know — share cards, theme colour, and a painted
 * background so there's no white flash before the app boots.
 */
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const file = join(root, 'dist', 'index.html');
if (!existsSync(file)) {
  console.error('dist/index.html not found — run `expo export --platform web` first.');
  process.exit(1);
}

const site = process.env.EXPO_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? '';
const title = 'Meridian — the daily trivia championship';
const description = 'Sixty seconds a run. Three seconds a question. One crown a day.';
copyFileSync(join(root, 'assets', 'og.png'), join(root, 'dist', 'og.png'));

const head = `
    <meta name="description" content="${description}" />
    <meta name="theme-color" content="#1E1C5E" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${site}/og.png" />
    <meta name="twitter:card" content="summary_large_image" />
    <style>html,body{background:#0C0D24;margin:0}</style>`;

let html = readFileSync(file, 'utf8');
if (!html.includes('og:title')) {
  html = html.replace('</head>', `${head}\n  </head>`);
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`);
  writeFileSync(file, html);
}
console.log('dist/index.html: meta tags and background added.');
