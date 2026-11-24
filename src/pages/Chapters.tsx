import { CHAPTERS } from '../game/levels';
import { SaveData, isChapterComplete, isChapterUnlocked, isLevelUnlocked, k } from '../game/storage';
import { Page, ShapeIcon, Stars } from '../components/ui';
import { sfx } from '../game/sfx';

export function Chapters({ data, onBack, onPlay, onSkin }: { data: SaveData; onBack: () => void; onPlay: (c: number, l: number) => void; onSkin: (s: SaveData['skin']) => void }) {
  return (
    <Page title="Capítulos" onBack={onBack}>
      <div className="mb-5 rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="mb-2 text-xs font-bold uppercase tracking-wider text-white/50">Tu forma (premios desbloqueados)</div>
        <div className="flex flex-wrap gap-2">
          {CHAPTERS.map(c => {
            const s = c.id === 1 ? 'circle' : CHAPTERS[c.id - 2].reward.skin;
            const owned = data.skins.includes(s);
            return (
              <button key={s} disabled={!owned} onClick={() => { sfx.click(); onSkin(s); }}
                className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition ${data.skin === s ? 'bg-white/20 ring-2 ring-white' : 'bg-black/30'} disabled:opacity-30`}>
                <ShapeIcon shape={s} color={c.color} size={26} /> {owned ? s : '🔒'}
              </button>
            );
          })}
        </div>
      </div>
      <div className="space-y-5">
        {CHAPTERS.map(c => {
          const unlocked = isChapterUnlocked(data, c.id);
          const complete = isChapterComplete(data, c.id);
          const stars = Array.from({ length: c.levels }, (_, i) => data.stars[k(c.id, i + 1)] ?? 0);
          const sum = stars.reduce((a, b) => a + b, 0);
          return (
            <div key={c.id} className={`rounded-3xl border p-4 transition ${unlocked ? 'border-white/10 bg-white/5' : 'border-white/5 bg-black/30 opacity-60'}`} style={unlocked ? { boxShadow: `inset 0 0 60px ${c.color}14` } : {}}>
              <div className="mb-3 flex items-center gap-3">
                <ShapeIcon shape={c.shape} color={c.color} size={44} spin={unlocked && !complete} />
                <div className="flex-1">
                  <div className="text-lg font-black" style={{ color: c.color }}>Capítulo {c.id}: {c.name}</div>
                  <div className="text-xs text-white/60">{c.subtitle} · ★ {sum}/{c.levels * 3}</div>
                </div>
                <div className="text-right text-xs">
                  {complete ? <span className="rounded-lg bg-yellow-300/20 px-2 py-1 font-black text-yellow-300">🏆 {c.reward.title}</span>
                    : unlocked ? <span className="text-white/60">🎁 Premio: <b>{c.reward.title}</b></span>
                      : <span className="text-white/40">🔒 Completa el cap. {c.id - 1}</span>}
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
                {stars.map((s, i) => {
                  const l = i + 1, ok = isLevelUnlocked(data, c.id, l), last = l === c.levels;
                  return (
                    <button key={l} disabled={!ok} onClick={() => onPlay(c.id, l)}
                      className={`flex aspect-square flex-col items-center justify-center rounded-2xl text-lg font-black transition active:scale-95 ${ok ? 'bg-black/40 hover:bg-black/60' : 'bg-black/20 text-white/25'}`}
                      style={ok ? { border: `2px solid ${s > 0 ? c.color : c.color + '66'}`, color: '#fff', boxShadow: s === 0 ? `0 0 18px ${c.color}66` : undefined } : { border: '2px solid transparent' }}>
                      <span>{ok ? (last ? '👑' : l) : '🔒'}</span>
                      <Stars n={s} size="text-[10px]" />
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </Page>
  );
}
