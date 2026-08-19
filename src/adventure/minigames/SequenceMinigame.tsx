import { useEffect, useState, type JSX } from 'react';

const PAD_COLORS = ['#c65c52', '#4f8fd1', '#5fae72', '#d1a63f'];
const HIGHLIGHT_MS = 500;
const GAP_MS = 250;

type Phase = 'showing' | 'input';

/**
 * Plantilla "memoria de secuencia" (tipo Simon) — el motor genera una
 * secuencia al azar de `sequenceLength` pasos, la reproduce una vez, y el
 * jugador tiene que repetirla clickeando los mismos paneles en orden. Ver
 * SceneAction "openMinigame" en schemas.ts y MinigameHost.tsx.
 */
export function SequenceMinigame({
  sequenceLength,
  onComplete,
}: {
  sequenceLength: number;
  onComplete: (success: boolean) => void;
}): JSX.Element {
  const [sequence] = useState<number[]>(() =>
    Array.from({ length: Math.max(1, sequenceLength) }, () => Math.floor(Math.random() * PAD_COLORS.length)),
  );
  const [phase, setPhase] = useState<Phase>('showing');
  const [highlighted, setHighlighted] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function playback(): Promise<void> {
      for (const pad of sequence) {
        if (cancelled) return;
        setHighlighted(pad);
        await new Promise((resolve) => window.setTimeout(resolve, HIGHLIGHT_MS));
        if (cancelled) return;
        setHighlighted(null);
        await new Promise((resolve) => window.setTimeout(resolve, GAP_MS));
      }
      if (!cancelled) setPhase('input');
    }
    void playback();
    return () => {
      cancelled = true;
    };
  }, [sequence]);

  function handlePadClick(pad: number): void {
    if (phase !== 'input') return;
    const expected = sequence[progress];
    if (expected === undefined || pad !== expected) {
      onComplete(false);
      return;
    }
    const next = progress + 1;
    if (next >= sequence.length) {
      onComplete(true);
      return;
    }
    setProgress(next);
  }

  return (
    <div className="flex flex-col items-center gap-4 rounded border border-amber-accent/40 bg-graphite-950 p-6">
      <p className="text-[11px] tracking-widest text-graphite-300 uppercase">
        {phase === 'showing' ? 'Memorizá la secuencia...' : 'Repetila en el mismo orden'}
      </p>
      <div className="grid grid-cols-2 gap-3">
        {PAD_COLORS.map((color, index) => (
          <button
            key={index}
            type="button"
            onClick={() => handlePadClick(index)}
            disabled={phase !== 'input'}
            className="h-20 w-20 rounded transition-opacity disabled:cursor-not-allowed"
            style={{
              backgroundColor: color,
              opacity: highlighted === index ? 1 : phase === 'input' ? 0.55 : 0.3,
              boxShadow: highlighted === index ? `0 0 16px ${color}` : 'none',
            }}
          />
        ))}
      </div>
      <p className="text-[9px] text-graphite-500">{phase === 'input' ? `${progress}/${sequence.length}` : ' '}</p>
    </div>
  );
}
