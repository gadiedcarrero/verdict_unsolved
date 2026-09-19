import { describe, expect, it } from 'vitest';
import { SceneSchema } from '@/game-engine/scene-engine/schemas';
import { clipsAt, panelAt, panelSpans, sceneDurationMs } from '@/game-engine/scene-engine/timeline';

function scene(raw: Record<string, unknown>) {
  return SceneSchema.parse({ id: 'e1', act: 1, kind: 'cinematica', backgrounds: [], ...raw });
}

function track(id: string, clips: Record<string, unknown>[], extra: Record<string, unknown> = {}) {
  return { id, label: id, clips, ...extra };
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
      audioTracks: [track('t1', [{ id: 'c1', path: 'sounds/x.mp3', startMs: 500, durationMs: 4000 }])],
    });

    expect(sceneDurationMs(conCola)).toBe(4500);
  });

  // Una cama de ambiente se repite mientras dure la escena; si estirara la
  // escena hasta su final, la escena no terminaría nunca.
  it('no se estira por una pista en loop', () => {
    const conCama = scene({
      backgrounds: [{ id: 'bg-1', assetPath: 'a.png', durationMs: 1000 }],
      audioTracks: [
        track('ambiente', [{ id: 'c1', path: 'sounds/lluvia.mp3', startMs: 0, durationMs: 9000 }], { loop: true }),
      ],
    });

    expect(sceneDurationMs(conCama)).toBe(1000);
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
    audioTracks: [
      track('ambiente', [{ id: 'lluvia', path: 'sounds/lluvia.mp3', startMs: 0, durationMs: 5000 }]),
      track('efectos', [{ id: 'portazo', path: 'sounds/portazo.mp3', startMs: 2000, durationMs: 500 }]),
    ],
  });

  // Dos sonidos a la vez es justamente lo que el sonido por panel no podía
  // expresar: la lluvia de fondo y el golpe encima.
  it('devuelve todos los clips que suenan a la vez, de pistas distintas', () => {
    expect(clipsAt(conAudio, 2200).map((c) => c.clip.id)).toEqual(['lluvia', 'portazo']);
  });

  it('deja afuera los que ya terminaron', () => {
    expect(clipsAt(conAudio, 5500).map((c) => c.clip.id)).toEqual([]);
  });

  // El reproductor necesita el punto del archivo, no solo saber que suena:
  // saltar a la mitad de la escena tiene que agarrar la lluvia por la mitad.
  it('dice en qué punto del clip está la cabeza', () => {
    expect(clipsAt(conAudio, 2200)[0]?.offsetMs).toBe(2200);
    expect(clipsAt(conAudio, 2200)[1]?.offsetMs).toBe(200);
  });

  it('silencia una pista entera sin borrar sus clips', () => {
    const conMute = scene({
      backgrounds: [{ id: 'bg-1', assetPath: 'a.png', durationMs: 6000 }],
      audioTracks: [
        track('ambiente', [{ id: 'lluvia', path: 'sounds/lluvia.mp3', startMs: 0, durationMs: 5000 }], {
          muted: true,
        }),
      ],
    });

    expect(clipsAt(conMute, 1000)).toEqual([]);
    expect(conMute.audioTracks[0]?.clips).toHaveLength(1);
  });

  // Varias pistas pueden estar en loop a la vez y cada una da la vuelta por su
  // cuenta: la música cada 8s, el ambiente cada 3s.
  it('da la vuelta en las pistas en loop, cada una a su ritmo', () => {
    const enLoop = scene({
      backgrounds: [{ id: 'bg-1', assetPath: 'a.png', durationMs: 30000 }],
      audioTracks: [
        track('musica', [{ id: 'tema', path: 'sounds/tema.mp3', startMs: 0, durationMs: 8000 }], { loop: true }),
        track('ambiente', [{ id: 'viento', path: 'sounds/viento.mp3', startMs: 0, durationMs: 3000 }], { loop: true }),
      ],
    });

    const sonando = clipsAt(enLoop, 10000);
    expect(sonando.map((c) => [c.clip.id, c.offsetMs])).toEqual([
      ['tema', 2000],
      ['viento', 1000],
    ]);
  });

  it('una pista en loop no empieza antes de donde arranca su clip', () => {
    const tardio = scene({
      backgrounds: [{ id: 'bg-1', assetPath: 'a.png', durationMs: 30000 }],
      audioTracks: [
        track('musica', [{ id: 'tema', path: 'sounds/tema.mp3', startMs: 5000, durationMs: 2000 }], { loop: true }),
      ],
    });

    expect(clipsAt(tardio, 4000)).toEqual([]);
    expect(clipsAt(tardio, 9500)[0]?.offsetMs).toBe(500);
  });
});

// El formato viejo tenía una sola pista sin nombre. Los guiones ya guardados
// tienen que seguir abriendo con su audio en su lugar.
describe('migración de audioTrack a audioTracks', () => {
  it('envuelve la pista única vieja en una pista con nombre', () => {
    const viejo = scene({
      backgrounds: [{ id: 'bg-1', assetPath: 'a.png', durationMs: 6000 }],
      audioTrack: [{ id: 'lluvia', path: 'sounds/lluvia.mp3', startMs: 1000, durationMs: 2000 }],
    });

    expect(viejo.audioTracks).toHaveLength(1);
    expect(viejo.audioTracks[0]?.loop).toBe(false);
    expect(clipsAt(viejo, 1500).map((c) => c.clip.id)).toEqual(['lluvia']);
  });
});
