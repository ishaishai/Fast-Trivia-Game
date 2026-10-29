import type { CategoryId } from '../types';

export const CATEGORIES: Record<CategoryId, { label: string; name: string }> = {
  earth: { label: 'Earth', name: 'Geography' },
  science: { label: 'Lab', name: 'Science' },
  orbit: { label: 'Orbit', name: 'Space' },
  past: { label: 'Past', name: 'History' },
  canvas: { label: 'Canvas', name: 'Art & design' },
  sound: { label: 'Sound', name: 'Music' },
  screen: { label: 'Screen', name: 'Film & TV' },
  words: { label: 'Words', name: 'Language' },
  wild: { label: 'Wild', name: 'Nature' },
  play: { label: 'Play', name: 'Sport' },
  taste: { label: 'Taste', name: 'Food & drink' },
  code: { label: 'Code', name: 'Technology' },
};

export const CATEGORY_IDS = Object.keys(CATEGORIES) as CategoryId[];
