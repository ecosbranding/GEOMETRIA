import { CHAPTERS, Shape } from './levels';

const KEY = 'geometria-save-v1';

export interface HighScore { score: number; chapter: number; level: number; date: number; name: string }
export interface SaveData {
  stars: Record<string, number>; // "c-l" -> 0..3
  highscores: HighScore[];
  skins: Shape[];
  skin: Shape;
  muted: boolean;
  bestScore: Record<string, number>;
  name: string;
}

const def: SaveData = {
  stars: {}, highscores: [], skins: ['circle'], skin: 'circle', muted: false, bestScore: {}, name: 'TÚ',
};

export function load(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...def };
    return { ...def, ...JSON.parse(raw) };
  } catch { return { ...def }; }
}
export function save(d: SaveData) {
  try { localStorage.setItem(KEY, JSON.stringify(d)); } catch { /* ignore */ }
}

export const k = (c: number, l: number) => `${c}-${l}`;

export function isChapterComplete(d: SaveData, c: number) {
  const ch = CHAPTERS[c - 1];
  if (!ch) return false;
  for (let l = 1; l <= ch.levels; l++) if (!(d.stars[k(c, l)] > 0)) return false;
  return true;
}
export function isChapterUnlocked(d: SaveData, c: number) {
  return c === 1 || isChapterComplete(d, c - 1);
}
export function isLevelUnlocked(d: SaveData, c: number, l: number) {
  if (!isChapterUnlocked(d, c)) return false;
  return l === 1 || d.stars[k(c, l - 1)] > 0;
}
/** First not-yet-cleared level, or last level if everything is done. */
export function nextLevel(d: SaveData): { c: number; l: number } {
  for (const ch of CHAPTERS) {
    for (let l = 1; l <= ch.levels; l++) if (!(d.stars[k(ch.id, l)] > 0)) return { c: ch.id, l };
  }
  return { c: 5, l: 8 };
}
export function totalStars(d: SaveData) {
  return Object.values(d.stars).reduce((a, b) => a + b, 0);
}
export function addHighScore(d: SaveData, hs: HighScore) {
  d.highscores = [...d.highscores, hs].sort((a, b) => b.score - a.score).slice(0, 10);
}
