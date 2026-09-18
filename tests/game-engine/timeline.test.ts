import { describe, expect, it } from 'vitest';
import { SceneSchema } from '@/game-engine/scene-engine/schemas';
import { clipsAt, panelAt, panelSpans, sceneDurationMs } from '@/game-engine/scene-engine/timeline';

function scene(raw: Record<string, unknown>) {
  return SceneSchema.parse({ id: 'e1', act: 1, kind: 'cinematica', backgrounds: [], ...raw });
}

const TRES_PANELES = scene({
  backgrounds: [
    { id: 'bg-1', assetPath: 'a.png', durationMs: 1000 },
    { id: 'bg-2', assetPath: 'b.png', durationMs: 2000 },
    // Sin duración propia: cae al default.
    { id: 'bg-3', assetPath: 'c.png' },
  ],
});

describe('panelSpans', () => {
  it('coloca cada panel después del anterior', () => {
    expect(panelSpans(TRES_PANELES).map((s) => [s.background.id, s.startMs, s.durationMs])).toEqual([
      ['bg-1', 0, 1000],
      ['bg-2', 1000, 2000],
      ['bg-3', 3000, 2500],
    ]);
  });
});

describe('sceneDurationMs', () => {
  it('suma las duraciones de los paneles', () => {
    expect(sceneDurationMs(TRES_PANELES)).toBe(5500);
  });

  // Un sonido que sigue después de la última imagen es parte de la escena: si
  // la pista no lo abarcara, no habría forma de verlo ni de moverlo.
  it('llega hasta donde termina el audio si sobresale', () => {
    const conCola = scene({
      backgrounds: [{ id: 'bg-1', assetPath: 'a.png', durationMs: 1000 }],
      audioTrack: [{ id: 'c1', path: 'sounds/x.mp3', startMs: 500, durationMs: 4000 }],
    });

    expect(sceneDurationMs(conCola)).toBe(4500);
  });
});

describe('panelAt', () => {
  it('encuentra el panel que se ve en un momento dado', () => {
    expect(panelAt(TRES_PANELES, 0)?.id).toBe('bg-1');
    expect(panelAt(TRES_PANELES, 999)?.id).toBe('bg-1');
    expect(panelAt(TRES_PANELES, 1000)?.id).toBe('bg-2');
    expect(panelAt(TRES_PANELES, 3500)?.id).toBe('bg-3');
  });

  it('devuelve null pasada la última imagen', () => {
    expect(panelAt(TRES_PANELES, 5500)).toBeNull();
  });
});

describe('clipsAt', () => {
  const conAudio = scene({
    backgrounds: [{ id: 'bg-1', assetPath: 'a.png', durationMs: 6000 }],
    audioTrack: [
      { id: 'lluvia', path: 'sounds/lluvia.mp3', startMs: 0, durationMs: 5000 },
      { id: 'portazo', path: 'sounds/portazo.mp3', startMs: 2000, durationMs: 500 },
    ],
  });

  // Dos sonidos a la vez es justamente lo que el sonido por panel no podía
  // expresar: la lluvia de fondo y el golpe encima.
  it('devuelve todos los clips que suenan a la vez', () => {
    expect(clipsAt(conAudio, 2200).map((c) => c.id)).toEqual(['lluvia', 'portazo']);
  });

  it('deja afuera los que ya terminaron', () => {
    expect(clipsAt(conAudio, 5500).map((c) => c.id)).toEqual([]);
  });
});
