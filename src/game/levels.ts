export type Shape = 'circle' | 'triangle' | 'square' | 'hexagon' | 'star';

export interface ChapterDef {
  id: number;
  name: string;
  subtitle: string;
  shape: Shape;
  color: string; // primary accent
  color2: string; // secondary
  bg: string;
  levels: number;
  reward: { title: string; desc: string; skin: Shape; teaser: string };
}

export const CHAPTERS: ChapterDef[] = [
  {
    id: 1, name: 'Círculos', subtitle: 'El despertar', shape: 'circle',
    color: '#22d3ee', color2: '#a5f3fc', bg: '#06121f', levels: 8,
    reward: { title: 'Núcleo Prisma', desc: 'Desbloqueaste la estela de luz y el Capítulo 2.', skin: 'triangle',
      teaser: 'Algo te persigue en la oscuridad… los Triángulos cazan.' },
  },
  {
    id: 2, name: 'Triángulos', subtitle: 'La cacería', shape: 'triangle',
    color: '#f472b6', color2: '#fbcfe8', bg: '#1b0a1a', levels: 8,
    reward: { title: 'Colmillo Rosa', desc: 'Nueva forma de jugador: Triángulo. Capítulo 3 abierto.', skin: 'square',
      teaser: 'Los Cuadrados no se mueven. No lo necesitan: disparan.' },
  },
  {
    id: 3, name: 'Cuadrados', subtitle: 'Fuego cruzado', shape: 'square',
    color: '#fbbf24', color2: '#fde68a', bg: '#1a1304', levels: 8,
    reward: { title: 'Bloque Dorado', desc: 'Forma Cuadrado y multiplicador x12 desbloqueados.', skin: 'hexagon',
      teaser: 'Un zumbido recorre la arena. Los láseres Hexágono se activan.' },
  },
  {
    id: 4, name: 'Hexágonos', subtitle: 'Rayos de colmena', shape: 'hexagon',
    color: '#a78bfa', color2: '#ddd6fe', bg: '#0f0a1f', levels: 8,
    reward: { title: 'Panal Violeta', desc: 'Forma Hexágono. El capítulo final te espera.', skin: 'star',
      teaser: 'La arena se encoge. Las Estrellas lo traen TODO. ¿Puedes con la Corona?' },
  },
  {
    id: 5, name: 'Estrellas', subtitle: 'Colapso final', shape: 'star',
    color: '#34d399', color2: '#a7f3d0', bg: '#04170f', levels: 8,
    reward: { title: 'CORONA GEOMÉTRICA', desc: 'Lo lograste. Eres leyenda de la arena. Forma Estrella desbloqueada.', skin: 'star',
      teaser: '¡Modo Leyenda! Vuelve a cualquier nivel y persigue las 3 estrellas perfectas.' },
  },
];

export interface LevelParams {
  target: number;
  speedMul: number;
  bouncers: number;
  chasers: number;
  shooters: number;
  laserInterval: number; // 0 = none
  shrink: boolean;
  gemsAtOnce: number;
  lives: number;
}

export function getLevelParams(ch: number, lvl: number): LevelParams {
  const c = ch - 1;
  return {
    target: 8 + lvl * 2 + c * 2,
    speedMul: 1 + c * 0.14 + (lvl - 1) * 0.07,
    bouncers: 2 + Math.floor(lvl / 2) + c,
    chasers: ch >= 2 ? Math.floor((lvl + 1) / 3) + (ch - 2) : lvl >= 7 ? 1 : 0,
    shooters: ch >= 3 ? Math.min(1 + Math.floor(lvl / 3) + (ch - 3), 5) : 0,
    laserInterval: ch >= 4 ? Math.max(1.8, 5 - lvl * 0.3 - (ch - 4) * 0.8) : 0,
    shrink: ch >= 5,
    gemsAtOnce: ch >= 5 ? 2 : 3,
    lives: 3,
  };
}

export const TOTAL_LEVELS = CHAPTERS.reduce((a, c) => a + c.levels, 0);
