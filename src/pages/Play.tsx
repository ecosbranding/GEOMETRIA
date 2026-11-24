import { useCallback, useEffect, useRef, useState } from 'react';
import { CHAPTERS } from '../game/levels';
import { Engine, LevelResult } from '../game/engine';
import { SaveData, addHighScore, k } from '../game/storage';
import { sfx } from '../game/sfx';
import { Btn, ShapeIcon, Stars } from '../components/ui';

type Overlay = { kind: 'none' } | { kind: 'paused' } | { kind: 'complete'; r: LevelResult; isNew: boolean } | { kind: 'reward'; r: LevelResult } | { kind: 'over'; levelScore: number; rank: number };

interface Props {
  data: SaveData; setData: (fn: (d: SaveData) => SaveData) => void;
  chapter: number; level: number; onExit: () => void; onChangeLevel: (c: number, l: number) => void;
}

export function Play({ data, setData, chapter, level, onExit, onChangeLevel }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engRef = useRef<Engine | null>(null);
  const [ov, setOv] = useState<Overlay>({ kind: 'none' });
  const [run, setRun] = useState(0); // accumulated run score (prior levels)
  const runRef = useRef(0);
  const ch = CHAPTERS[chapter - 1];
  const dataRef = useRef(data); dataRef.current = data;
  const posRef = useRef({ chapter, level }); posRef.current = { chapter, level };

  const onLevelComplete = useCallback((r: LevelResult) => {
    const { chapter: c, level: l } = posRef.current;
    const key = k(c, l);
    const prev = dataRef.current.stars[key] ?? 0;
    const prevBest = dataRef.current.bestScore[key] ?? 0;
    const isLast = l === CHAPTERS[c - 1].levels;
    const wasComplete = prev > 0;
    setData(d => {
      const n = { ...d, stars: { ...d.stars, [key]: Math.max(prev, r.stars) }, bestScore: { ...d.bestScore, [key]: Math.max(prevBest, r.score) } };
      if (isLast) {
        const skin = CHAPTERS[c - 1].reward.skin;
        if (!n.skins.includes(skin)) n.skins = [...n.skins, skin];
      }
      return n;
    });
    runRef.current += r.score; setRun(runRef.current);
    if (isLast && !wasComplete) { setTimeout(() => sfx.reward(), 300); setOv({ kind: 'reward', r }); }
    else setOv({ kind: 'complete', r, isNew: r.score > prevBest });
  }, [setData]);

  const onGameOver = useCallback((levelScore: number) => {
    const total = runRef.current + levelScore;
    const { chapter: c, level: l } = posRef.current;
    let rank = -1;
    if (total > 0) {
      const entry = { score: total, chapter: c, level: l, date: Date.now(), name: dataRef.current.name || 'TÚ' };
      const preview = { ...dataRef.current, highscores: [...dataRef.current.highscores] };
      addHighScore(preview, entry);
      rank = preview.highscores.indexOf(entry);
      setData(d => { const n = { ...d, highscores: [...d.highscores] }; addHighScore(n, entry); return n; });
    }
    setOv({ kind: 'over', levelScore, rank });
  }, [setData]);

  // boot engine once
  useEffect(() => {
    const canvas = canvasRef.current!;
    const eng = new Engine(canvas, {
      onLevelComplete: r => onLevelComplete(r),
      onGameOver: s => onGameOver(s),
      onPauseToggle: p => setOv(p ? { kind: 'paused' } : { kind: 'none' }),
    });
    engRef.current = eng;
    return () => { eng.destroy(); engRef.current = null; };
  }, [onLevelComplete, onGameOver]);

  // start level when chapter/level changes
  useEffect(() => {
    setOv({ kind: 'none' });
    engRef.current?.start(chapter, level, dataRef.current.skin);
  }, [chapter, level]);

  const restart = useCallback((resetRun: boolean) => {
    if (resetRun) { runRef.current = 0; setRun(0); }
    setOv({ kind: 'none' });
    engRef.current?.start(posRef.current.chapter, posRef.current.level, dataRef.current.skin);
  }, []);

  const next = useCallback(() => {
    const { chapter: c, level: l } = posRef.current;
    const chd = CHAPTERS[c - 1];
    if (l < chd.levels) onChangeLevel(c, l + 1);
    else if (c < CHAPTERS.length) onChangeLevel(c + 1, 1);
    else onExit();
  }, [onChangeLevel, onExit]);

  const endRun = useCallback(() => {
    // leaving: record run as a high score if any
    const total = runRef.current;
    const { chapter: c, level: l } = posRef.current;
    if (total > 0) setData(d => { const n = { ...d, highscores: [...d.highscores] }; addHighScore(n, { score: total, chapter: c, level: l, date: Date.now(), name: d.name || 'TÚ' }); return n; });
    onExit();
  }, [onExit, setData]);

  // overlay hotkeys
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'r') { restart(ov.kind === 'over'); return; }
      if (key === 'enter' || key === ' ') {
        if (ov.kind === 'complete' || ov.kind === 'reward') next();
        else if (ov.kind === 'over') restart(true);
        else if (ov.kind === 'paused') engRef.current?.togglePause();
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [ov, restart, next]);

  const isLast = level === ch.levels;
  const nextLabel = isLast ? (chapter < CHAPTERS.length ? `Capítulo ${chapter + 1} →` : 'Volver al inicio') : `Nivel ${level + 1} →`;

  return (
    <div className="fixed inset-0 bg-[#05060a] text-white" style={{ ['--c' as string]: ch.color }}>
      <canvas ref={canvasRef} className="block h-full w-full" />

      {/* top-right controls */}
      {ov.kind === 'none' && (
        <div className="absolute right-2 top-2 flex gap-1 sm:right-4 sm:top-16">
          <button onClick={() => engRef.current?.togglePause()} className="rounded-xl bg-black/50 px-3 py-2 text-sm font-black backdrop-blur hover:bg-black/70 active:scale-95">❚❚</button>
        </div>
      )}
      <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 text-[11px] font-bold text-white/40">RACHA: {(run + 0).toLocaleString()} pts acumulados</div>

      {ov.kind !== 'none' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-pop">
          <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#0c0e16] p-6 text-center shadow-2xl" style={{ boxShadow: `0 0 80px ${ch.color}33` }}>
            {ov.kind === 'paused' && (
              <>
                <h2 className="text-3xl font-black">PAUSA</h2>
                <p className="mt-1 text-sm text-white/60">Cap {chapter} · Nivel {level} · {ch.name}</p>
                <div className="mt-6 grid gap-2">
                  <Btn color={ch.color} onClick={() => engRef.current?.togglePause()}>▶ Continuar</Btn>
                  <Btn variant="ghost" onClick={() => restart(false)}>↻ Reiniciar nivel (R)</Btn>
                  <Btn variant="ghost" onClick={() => { setData(d => ({ ...d, muted: !d.muted })); }}>{data.muted ? '🔇 Sonido: OFF' : '🔊 Sonido: ON'}</Btn>
                  <Btn variant="ghost" onClick={endRun}>Salir al menú</Btn>
                </div>
              </>
            )}
            {ov.kind === 'complete' && (
              <>
                <div className="text-xs font-bold uppercase tracking-[0.3em] text-white/50">Nivel {level} superado</div>
                <div className="my-2 animate-pop"><Stars n={ov.r.stars} size="text-5xl" /></div>
                <div className="text-4xl font-black" style={{ color: ch.color }}>+{ov.r.score.toLocaleString()}</div>
                {ov.isNew && <div className="mt-1 text-xs font-black text-yellow-300">¡NUEVO RÉCORD DEL NIVEL!</div>}
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-white/70">
                  <Stat l="Tiempo" v={`${ov.r.time.toFixed(1)}s`} /><Stat l="Combo máx" v={`x${ov.r.maxCombo}`} /><Stat l="Racha" v={run.toLocaleString()} />
                </div>
                {ov.r.stars < 3 && <p className="mt-3 text-xs text-white/50">Sin recibir daño = ★★★. ¿Te atreves?</p>}
                <div className="mt-5 grid gap-2">
                  <Btn color={ch.color} className="text-lg" onClick={next}>{nextLabel}</Btn>
                  <Btn variant="ghost" onClick={() => restart(false)}>↻ Repetir (R)</Btn>
                  <Btn variant="ghost" onClick={endRun}>Menú</Btn>
                </div>
              </>
            )}
            {ov.kind === 'reward' && (
              <>
                <div className="text-xs font-bold uppercase tracking-[0.3em] text-yellow-300">¡Capítulo {chapter} completado!</div>
                <div className="relative mx-auto my-4 flex h-28 w-28 items-center justify-center">
                  <div className="absolute inset-0 animate-spin-slow rounded-full" style={{ background: `conic-gradient(${ch.color}, transparent 40%, ${ch.color2}, transparent 80%, ${ch.color})`, filter: 'blur(14px)', opacity: 0.8 }} />
                  <div className="relative animate-pop"><ShapeIcon shape={ch.reward.skin} color={CHAPTERS[Math.min(chapter, CHAPTERS.length - 1)].color} size={96} spin /></div>
                </div>
                <h2 className="text-2xl font-black" style={{ color: ch.color }}>🎁 {ch.reward.title}</h2>
                <p className="mt-1 text-sm text-white/80">{ch.reward.desc}</p>
                <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3 text-sm italic text-white/70">“{ch.reward.teaser}”</div>
                <div className="mt-2 text-xs text-white/50">Nivel: <Stars n={ov.r.stars} size="text-sm" /> · +{ov.r.score.toLocaleString()} pts</div>
                <div className="mt-5 grid gap-2">
                  <Btn color={ch.color} className="text-lg animate-pulse-glow" onClick={next}>{chapter < CHAPTERS.length ? `Entrar al Capítulo ${chapter + 1} →` : '🏆 Volver al inicio'}</Btn>
                  <Btn variant="ghost" onClick={endRun}>Menú</Btn>
                </div>
              </>
            )}
            {ov.kind === 'over' && (
              <>
                <h2 className="text-4xl font-black text-red-400">K.O.</h2>
                <p className="mt-1 text-sm text-white/60">Cap {chapter} · Nivel {level}</p>
                <div className="mt-3 text-xs uppercase tracking-wider text-white/50">Racha final</div>
                <div className="text-4xl font-black">{(run + ov.levelScore).toLocaleString()}</div>
                {ov.rank >= 0 && ov.rank < 10 && <div className="mt-1 text-xs font-black text-yellow-300">🏅 Puesto #{ov.rank + 1} en récords</div>}
                <div className="mt-5 grid gap-2">
                  <Btn color={ch.color} className="text-lg" onClick={() => restart(true)}>↻ Reintentar (R)</Btn>
                  <Btn variant="ghost" onClick={onExit}>Menú</Btn>
                </div>
                <p className="mt-3 text-xs text-white/40">Estabas al {Math.round((engRef.current?.collected ?? 0) / (engRef.current?.params.target ?? 1) * 100)}%. La próxima cae.</p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ l, v }: { l: string; v: string }) {
  return <div className="rounded-xl bg-white/5 p-2"><div className="text-[10px] uppercase tracking-wider text-white/40">{l}</div><div className="font-black text-white">{v}</div></div>;
}
