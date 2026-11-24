import { useCallback, useEffect, useState } from 'react';
import { load, save, SaveData } from './game/storage';
import { setMuted, unlockAudio } from './game/sfx';
import { Home } from './pages/Home';
import { Info } from './pages/Info';
import { Chapters } from './pages/Chapters';
import { Scores } from './pages/Scores';
import { Play } from './pages/Play';

type View = 'home' | 'info' | 'chapters' | 'scores' | 'play';

export default function App() {
  const [data, setDataState] = useState<SaveData>(() => load());
  const [view, setView] = useState<View>('home');
  const [pos, setPos] = useState({ c: 1, l: 1 });

  const setData = useCallback((fn: (d: SaveData) => SaveData) => {
    setDataState(prev => { const n = fn(prev); save(n); return n; });
  }, []);

  useEffect(() => { setMuted(data.muted); }, [data.muted]);
  useEffect(() => {
    const u = () => unlockAudio();
    window.addEventListener('pointerdown', u, { once: true });
    window.addEventListener('keydown', u, { once: true });
    return () => { window.removeEventListener('pointerdown', u); window.removeEventListener('keydown', u); };
  }, []);

  const play = (c: number, l: number) => { unlockAudio(); setPos({ c, l }); setView('play'); };

  if (view === 'play') return <Play data={data} setData={setData} chapter={pos.c} level={pos.l} onExit={() => setView('home')} onChangeLevel={(c, l) => setPos({ c, l })} />;
  if (view === 'info') return <Info onBack={() => setView('home')} />;
  if (view === 'chapters') return <Chapters data={data} onBack={() => setView('home')} onPlay={play} onSkin={s => setData(d => ({ ...d, skin: s }))} />;
  if (view === 'scores') return <Scores data={data} onBack={() => setView('home')} onName={n => setData(d => ({ ...d, name: n }))} />;
  return <Home data={data} go={v => setView(v as View)} onPlay={play} />;
}
