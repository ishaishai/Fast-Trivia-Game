import type { Light } from './palette';

const STYLE_ID = 'meridian-global';

const CSS = `
html, body, #root { height: 100%; background-color: var(--m-field); background-image: var(--m-sky); }
body {
  margin: 0;
  overscroll-behavior: none;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
  -webkit-tap-highlight-color: transparent;
}
*:focus { outline: none; }
/* A dark ring inside a white halo reads on any sky and on white cards. */
*:focus-visible { outline: 3px solid var(--m-focus); outline-offset: 2px; box-shadow: 0 0 0 8px #FFFFFF !important; }
input:focus-visible, textarea:focus-visible { outline-offset: 0; box-shadow: none !important; }
::selection { background: var(--m-sun); color: var(--m-on-sun); }
* { scrollbar-width: thin; scrollbar-color: var(--m-line) transparent; }
*::-webkit-scrollbar { width: 8px; height: 8px; }
*::-webkit-scrollbar-thumb { background: var(--m-line); border-radius: 8px; }
*::-webkit-scrollbar-track { background: transparent; }
[data-cursor="pointer"], [role="button"], a { cursor: pointer; }
@media (prefers-reduced-motion: reduce) {
  * { scroll-behavior: auto !important; }
}
`;

/** Global CSS the web needs and React Native can't express: focus rings, selection, scrollbars. */
export function applyWebStyles(light: Light): void {
  if (typeof document === 'undefined') return;
  let tag = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!tag) {
    tag = document.createElement('style');
    tag.id = STYLE_ID;
    tag.textContent = CSS;
    document.head.appendChild(tag);
  }
  const root = document.documentElement.style;
  root.setProperty('--m-field', light.field);
  root.setProperty('--m-sky', `linear-gradient(180deg, ${light.sky[0]}, ${light.sky[1]})`);
  root.setProperty('--m-sun', light.sun);
  root.setProperty('--m-on-sun', light.onSun);
  root.setProperty('--m-focus', light.focus);
  root.setProperty('--m-line', light.line);
  root.setProperty('color-scheme', light.statusBar === 'dark' ? 'light' : 'dark');
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', light.field);
}
