import { CHAPTERS } from '../game/levels';
import { SaveData } from '../game/storage';
import { Page } from '../components/ui';

export function Scores({ data, onBack, onName }: { data: SaveData; onBack: () => void; onName: (n: string) => void }) {
  return (
    <Page title="Récords locales" onBack={onBack} color="#fbbf24">
      <div className="mb-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
        <label className="text-sm font-bold text-white/70">Tu nombre</label>
        <input value={data.name} maxLength={10} onChange={e => onName(e.target.value.toUpperCase())}
          className="w-32 rounded-lg bg-black/40 px-3 py-1.5 font-black tracking-wider text-white outline-none ring-1 ring-white/15 focus:ring-cyan-300" />
      </div>
      {data.highscores.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 p-10 text-center text-white/50">Aún no hay récords. ¡Juega una racha y vuelve!</div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/10 text-left text-xs uppercase tracking-wider text-white/60">
              <tr><th className="px-3 py-2">#</th><th className="px-3 py-2">Nombre</th><th className="px-3 py-2 text-right">Puntos</th><th className="px-3 py-2">Llegó a</th><th className="hidden px-3 py-2 sm:table-cell">Fecha</th></tr>
            </thead>
            <tbody>
              {data.highscores.map((h, i) => {
                const c = CHAPTERS[h.chapter - 1];
                return (
                  <tr key={i} className={`border-t border-white/5 ${i === 0 ? 'bg-yellow-300/10' : ''}`}>
                    <td className="px-3 py-2 font-black">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}</td>
                    <td className="px-3 py-2 font-bold">{h.name}</td>
                    <td className="px-3 py-2 text-right font-mono font-black">{h.score.toLocaleString()}</td>
                    <td className="px-3 py-2" style={{ color: c.color }}>Cap {h.chapter} · Niv {h.level}</td>
                    <td className="hidden px-3 py-2 text-white/50 sm:table-cell">{new Date(h.date).toLocaleDateString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Page>
  );
}
