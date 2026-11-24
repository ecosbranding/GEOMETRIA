import { ReactNode, useEffect, useRef } from 'react';
import { Shape } from '../game/levels';
import { drawShape } from '../game/engine';
import { sfx } from '../game/sfx';

export function Btn({ children, onClick, variant = 'primary', color, className = '', disabled }: {
  children: ReactNode; onClick?: () => void; variant?: 'primary' | 'ghost'; color?: string; className?: string; disabled?: boolean;
}) {
  const base = 'relative select-none rounded-2xl px-6 py-3 font-extrabold tracking-wide transition-all duration-150 active:scale-95 disabled:opacity-40 disabled:active:scale-100';
  const style = variant === 'primary'
    ? { background: color ?? '#22d3ee', color: '#0a0a0f', boxShadow: `0 6px 0 rgba(0,0,0,.45), 0 0 24px ${color ?? '#22d3ee'}66` }
    : { background: 'rgba(255,255,255,0.07)', color: '#fff', border: '1px solid rgba(255,255,255,0.14)' };
  return (
    <button disabled={disabled} className={`${base} ${className}`} style={style}
      onClick={() => { sfx.click(); onClick?.(); }}>
      {children}
    </button>
  );
}

export function ShapeIcon({ shape, color, size = 40, spin = false }: { shape: Shape; color: string; size?: number; spin?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = size * dpr; c.height = size * dpr;
    const ctx = c.getContext('2d')!;
    let raf = 0; let rot = 0;
    const draw = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, size, size);
      ctx.shadowColor = color; ctx.shadowBlur = size * 0.3; ctx.fillStyle = color;
      drawShape(ctx, shape, size / 2, size / 2, size * 0.36, rot); ctx.fill();
      ctx.shadowBlur = 0; ctx.fillStyle = '#fff';
      drawShape(ctx, shape, size / 2, size / 2, size * 0.16, rot); ctx.fill();
      if (spin) { rot += 0.02; raf = requestAnimationFrame(draw); }
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [shape, color, size, spin]);
  return <canvas ref={ref} style={{ width: size, height: size }} />;
}

export function Stars({ n, size = 'text-xl' }: { n: number; size?: string }) {
  return (
    <span className={`${size} tracking-tight`}>
      {[1, 2, 3].map(i => <span key={i} className={i <= n ? 'text-yellow-300 drop-shadow-[0_0_6px_rgba(253,224,71,.8)]' : 'text-white/15'}>★</span>)}
    </span>
  );
}

export function Page({ children, title, onBack, color = '#22d3ee' }: { children: ReactNode; title: string; onBack: () => void; color?: string }) {
  return (
    <div className="min-h-dvh bg-[#05060a] text-white">
      <div className="mx-auto max-w-3xl px-4 pb-16 pt-5">
        <div className="mb-6 flex items-center gap-3">
          <button onClick={() => { sfx.click(); onBack(); }} className="rounded-xl bg-white/8 px-3 py-2 text-sm font-bold hover:bg-white/15 active:scale-95">← Volver</button>
          <h1 className="text-2xl font-black tracking-tight" style={{ color }}>{title}</h1>
        </div>
        {children}
      </div>
    </div>
  );
}

export function BgShapes() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      {[...Array(14)].map((_, i) => {
        const shapes: Shape[] = ['circle', 'triangle', 'square', 'hexagon', 'star'];
        const colors = ['#22d3ee', '#f472b6', '#fbbf24', '#a78bfa', '#34d399'];
        return (
          <div key={i} className="absolute opacity-20 animate-float" style={{ left: `${(i * 37) % 100}%`, top: `${(i * 53) % 100}%`, animationDelay: `${-i * 1.3}s`, animationDuration: `${9 + (i % 5) * 2}s` }}>
            <ShapeIcon shape={shapes[i % 5]} color={colors[i % 5]} size={30 + (i % 4) * 18} />
          </div>
        );
      })}
    </div>
  );
}
