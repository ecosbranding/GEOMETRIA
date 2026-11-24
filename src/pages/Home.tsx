import { CHAPTERS, TOTAL_LEVELS as TOTAL } from '../game/levels';
import { SaveData, nextLevel, totalStars } from '../game/storage';
import { BgShapes, Btn, ShapeIcon } from '../components/ui';

export function Home({ data, go, onPlay }: { data: SaveData; go: (v: string) => void; onPlay: (c: number, l: number) => void }) {
  const nx = nextLevel(data);
  const ch = CHAPTERS[nx.c - 1];
  const best = data.highscores[0]?.score ?? 0;
  const stars = totalStars(data);
  return (
    <div className="relative min-h-dvh overflow-hidden bg-[#05060a] text-white">
      <BgShapes />
      <div className="relative mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 py-10 text-center">
        <div className="mb-3 flex items-center gap-3">
          {CHAPTERS.map(c => <ShapeIcon key={c.id} shape={c.shape} color={c.color} size={34} spin />)}
        </div>
        <h1 className="text-6xl font-black tracking-tighter sm:text-7xl" style={{ textShadow: '0 0 40px rgba(34,211,238,.5)' }}>
          GEO<span className="text-cyan-300">METRÍA</span>
        </h1>
        <p className="mt-2 text-sm font-semibold uppercase tracking-[0.3em] text-white/50">Arena de formas · 5 capítulos · 40 niveles</p>

        <div className="mt-8 w-full rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-white/50">
            <span>Siguiente desafío</span><span>★ {stars}/{TOTAL * 3}</span>
          </div>
          <div className="mt-1 flex items-center gap-3">
            <ShapeIcon shape={ch.shape} color={ch.color} size={44} />
            <div className="text-left">
              <div className="text-lg font-black" style={{ color: ch.color }}>Capítulo {ch.id}: {ch.name}</div>
              <div className="text-sm text-white/70">Nivel {nx.l} de {ch.levels} · {ch.subtitle}</div>
            </div>
          </div>
        </div>

        <Btn className="mt-5 w-full text-xl" color={ch.color} onClick={() => onPlay(nx.c, nx.l)}>▶ JUGAR</Btn>
        <div className="mt-3 grid w-full grid-cols-3 gap-2">
          <Btn variant="ghost" onClick={() => go('chapters')}>Capítulos</Btn>
          <Btn variant="ghost" onClick={() => go('info')}>Cómo jugar</Btn>
          <Btn variant="ghost" onClick={() => go('scores')}>Récords</Btn>
        </div>
        <p className="mt-6 text-xs text-white/40">Mejor puntuación: <span className="font-black text-white/80">{best.toLocaleString()}</span> · Teclado: WASD/Flechas · Móvil: arrastra</p>
      </div>
    </div>
  );
}
