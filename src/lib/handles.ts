const ADJECTIVES = [
  'quiet', 'solar', 'swift', 'amber', 'cobalt', 'lunar', 'early', 'bright', 'keen', 'nimble', 'polar',
  'coral', 'velvet', 'golden', 'steady', 'blue', 'noon', 'dusk', 'clever', 'bold',
];
const NOUNS = [
  'fox', 'comet', 'heron', 'lynx', 'kite', 'otter', 'wren', 'raven', 'moth', 'hare', 'owl', 'finch',
  'orca', 'lark', 'ibis', 'puma', 'crane', 'gecko', 'falcon', 'marten',
];

export function suggestHandle(rng: () => number = Math.random): string {
  return `${ADJECTIVES[Math.floor(rng() * ADJECTIVES.length)]}.${NOUNS[Math.floor(rng() * NOUNS.length)]}`;
}

export { HANDLE_PATTERN, handleProblem, normalizeHandle } from '@shared/handles';
