import { CHAPTERS } from '../game/levels';
import { Page, ShapeIcon } from '../components/ui';

const hazards = [
  { name: 'Rebotadores', color: '#ff5d5d', shape: 'square' as const, desc: 'Formas rojas que rebotan por la arena. Cada 5 gemas aparece uno más.' },
  { name: 'Cazadores', color: '#f472b6', shape: 'triangle' as const, desc: 'Triángulos rosas que te persiguen sin descanso. Úsalos: gira en círculos y pierden inercia.' },
  { name: 'Torretas', color: '#fbbf24', shape: 'square' as const, desc: 'Cuadrados dorados fijos. Brillan al cargar y disparan balas hacia ti.' },
  { name: 'Láseres', color: '#a78bfa', shape: 'hexagon' as const, desc: 'Línea punteada = aviso. Sal de ella antes de que se vuelva sólida.' },
  { name: 'Colapso', color: '#34d399', shape: 'star' as const, desc: 'En el capítulo final la arena se encoge con el tiempo. Sé rápido.' },
];

export function Info({ onBack }: { onBack: () => void }) {
  return (
    <Page title="Cómo jugar" onBack={onBack}>
      <section className="space-y-6">
        <Card title="Objetivo">
          <p>Eres una forma luminosa. Recoge las <b>gemas del color del capítulo</b> hasta llenar la barra superior. Esquiva todo lo <span className="font-bold text-red-400">rojo</span>, <span className="font-bold text-pink-400">rosa</span>, <span className="font-bold text-amber-300">dorado</span> y <span className="font-bold text-violet-300">violeta</span>. Tienes <b>3 vidas</b> por nivel.</p>
        </Card>
        <Card title="Controles">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-black/30 p-3">
              <div className="mb-1 text-xs font-bold uppercase tracking-wider text-cyan-300">Teclado</div>
              <p><kbd>W A S D</kbd> o <kbd>← ↑ ↓ →</kbd> para moverte · <kbd>P</kbd> / <kbd>Esc</kbd> pausa · <kbd>R</kbd> reinicio instantáneo · <kbd>Enter</kbd> continuar</p>
            </div>
            <div className="rounded-xl bg-black/30 p-3">
              <div className="mb-1 text-xs font-bold uppercase tracking-wider text-cyan-300">Táctil</div>
              <p>Toca y <b>arrastra en cualquier parte</b> de la arena: aparece un joystick virtual que te sigue. Suelta para frenar.</p>
            </div>
          </div>
        </Card>
        <Card title="Peligros">
          <ul className="space-y-3">
            {hazards.map(h => (
              <li key={h.name} className="flex items-start gap-3">
                <ShapeIcon shape={h.shape} color={h.color} size={36} />
                <div><div className="font-black" style={{ color: h.color }}>{h.name}</div><div className="text-sm text-white/70">{h.desc}</div></div>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Puntuación">
          <ul className="list-disc space-y-1 pl-5 text-sm text-white/80">
            <li>Cada gema vale <b>10 × combo</b>. El combo sube si recoges otra gema en menos de 2,2 s (máx. x8; x12 desde el Capítulo 3).</li>
            <li>Al terminar: <b>+150 por vida</b> restante y <b>bonus de tiempo</b> por acabar rápido.</li>
            <li>Estrellas: ★★★ sin recibir daño · ★★ un golpe · ★ dos golpes.</li>
            <li>La puntuación se acumula en una <b>racha</b> mientras no pierdas. Al perder, tu racha entra en la tabla de récords y empieza una nueva.</li>
          </ul>
        </Card>
        <Card title="Capítulos y premios">
          <p className="mb-3 text-sm text-white/70">Cada capítulo tiene 8 niveles, cada uno más difícil que el anterior. Para desbloquear un nivel debes superar el anterior. Al vencer el nivel 8 recibes un premio y se abre el siguiente capítulo.</p>
          <ul className="space-y-2">
            {CHAPTERS.map(c => (
              <li key={c.id} className="flex items-center gap-3 rounded-xl bg-black/30 p-2">
                <ShapeIcon shape={c.shape} color={c.color} size={32} />
                <div className="flex-1"><span className="font-black" style={{ color: c.color }}>Cap. {c.id} · {c.name}</span> <span className="text-sm text-white/60">— {c.subtitle}</span></div>
                <div className="text-right text-xs text-white/60">🎁 {c.reward.title}</div>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Consejos">
          <ul className="list-disc space-y-1 pl-5 text-sm text-white/80">
            <li>Al empezar y tras un golpe eres invulnerable un momento (parpadeas). Aprovéchalo para cruzar la arena.</li>
            <li>Encadena gemas: el multiplicador es donde está la puntuación de verdad.</li>
            <li>Los cazadores no pueden girar rápido. Un giro cerrado los deja atrás.</li>
          </ul>
        </Card>
      </section>
    </Page>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <h2 className="mb-3 text-lg font-black text-white">{title}</h2>
      <div className="text-white/85 [&_kbd]:rounded-md [&_kbd]:bg-white/15 [&_kbd]:px-1.5 [&_kbd]:py-0.5 [&_kbd]:font-mono [&_kbd]:text-xs">{children}</div>
    </div>
  );
}
