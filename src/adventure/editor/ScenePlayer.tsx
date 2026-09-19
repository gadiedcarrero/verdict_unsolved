import { useEffect, useRef, useState, type JSX } from 'react';
import type { Scene } from '../../game-engine/scene-engine/schemas';
import { clipsAt, panelAt, sceneDurationMs } from '../../game-engine/scene-engine/timeline';
import { gameAssetUrl } from '../gameAssetUrl';

/**
 * Reproduce la cinemática dentro del editor, con su audio y sus subtítulos.
 *
 * Se maneja por un reloj propio y no por temporizadores encadenados como
 * CinematicScene: acá hay que poder saltar a cualquier momento desde la línea
 * de tiempo, y una cadena de setTimeout no sabe retroceder. Qué se ve y qué
 * suena en el milisegundo actual se derivan (panelAt, clipsAt), así que mover
 * la cabeza de reproducción es cambiar un número.
 */
export function ScenePlayer({
  gameId,
  scene,
  playheadMs,
  playing,
  onPlayheadChange,
  onPlayingChange,
}: {
  gameId: string;
  scene: Scene;
  playheadMs: number;
  playing: boolean;
  onPlayheadChange: (ms: number) => void;
  onPlayingChange: (playing: boolean) => void;
}): JSX.Element {
  const totalMs = sceneDurationMs(scene);
  const current = panelAt(scene, playheadMs);
  const audiosRef = useRef(new Map<string, HTMLAudioElement>());

  // Avance del reloj. Se compara contra un timestamp real y no se suma el
  // intervalo: un setInterval se atrasa y la imagen se desfasaría del audio,
  // que sí corre en tiempo real.
  useEffect(() => {
    if (!playing) return;
    const startedAt = Date.now() - playheadMs;
    const handle = window.setInterval(() => {
      const next = Date.now() - startedAt;
      if (next >= totalMs) {
        onPlayheadChange(totalMs);
        onPlayingChange(false);
        return;
      }
      onPlayheadChange(next);
    }, 50);
    return () => window.clearInterval(handle);
    // playheadMs a propósito fuera: incluirlo reiniciaría el reloj en cada
    // tick. Al mover la cabeza a mano, el efecto se rearma por `playing`.
  }, [playing, totalMs, onPlayheadChange, onPlayingChange]);

  // Audio: cada clip suena mientras la cabeza esté dentro de él, y se
  // posiciona donde corresponda — así saltar a la mitad de la escena hace
  // sonar la lluvia desde su mitad, no desde el principio. El offset lo
  // calcula clipsAt, que es también quien sabe dar la vuelta en las pistas
  // en loop (una cama de ambiente suena toda la escena aunque el archivo
  // dure ocho segundos).
  useEffect(() => {
    const audios = audiosRef.current;
    const sounding = new Map(clipsAt(scene, playheadMs).map((entry) => [entry.clip.id, entry]));

    for (const track of scene.audioTracks) {
      for (const clip of track.clips) {
        const entry = playing ? sounding.get(clip.id) : undefined;
        let audio = audios.get(clip.id);
        if (!audio) {
          audio = new Audio(gameAssetUrl(gameId, clip.path));
          audios.set(clip.id, audio);
        }
        audio.volume = clip.volume;
        // `loop` nativo evita el silencio entre vueltas que deja reposicionar
        // a mano desde el intervalo del reloj.
        audio.loop = track.loop;
        if (!entry) {
          audio.pause();
          continue;
        }
        const offset = entry.offsetMs / 1000;
        if (Math.abs(audio.currentTime - offset) > 0.3) audio.currentTime = Math.max(0, offset);
        if (audio.paused) void audio.play().catch(() => {});
      }
    }
  }, [scene, playheadMs, playing, gameId]);

  // Al desmontar, callar todo: salir de la pestaña con la lluvia sonando
  // dejaría el audio corriendo sobre el resto del editor.
  useEffect(() => {
    const audios = audiosRef.current;
    return () => {
      for (const audio of audios.values()) audio.pause();
      audios.clear();
    };
  }, []);

  return (
    <div className="flex h-full flex-col bg-graphite-950">
      <div className="relative min-h-0 flex-1">
        <div className="absolute inset-0" style={{ backgroundColor: current?.backgroundColor ?? '#000' }} />
        {current?.assetPath.trim() && (
          <img
            src={gameAssetUrl(gameId, current.assetPath)}
            alt=""
            className="absolute inset-0 h-full w-full object-contain"
          />
        )}
        {current?.caption && (
          <div className="absolute inset-x-0 bottom-0 flex justify-center px-8 pb-[6%]">
            <p
              className="max-w-3xl text-center text-lg leading-snug font-medium whitespace-pre-line text-white"
              style={{ textShadow: '0 2px 6px rgba(0,0,0,0.95), 0 0 2px rgba(0,0,0,1)' }}
            >
              {current.caption}
            </p>
          </div>
        )}
        {!current && (
          <p className="absolute inset-0 flex items-center justify-center text-[11px] tracking-widest text-graphite-600 uppercase">
            {scene.backgrounds.length === 0 ? 'Sin paneles todavía' : 'Fin'}
          </p>
        )}
      </div>

      <Transport
        playing={playing}
        playheadMs={playheadMs}
        totalMs={totalMs}
        onPlayingChange={onPlayingChange}
        onPlayheadChange={onPlayheadChange}
      />
    </div>
  );
}

function Transport({
  playing,
  playheadMs,
  totalMs,
  onPlayingChange,
  onPlayheadChange,
}: {
  playing: boolean;
  playheadMs: number;
  totalMs: number;
  onPlayingChange: (playing: boolean) => void;
  onPlayheadChange: (ms: number) => void;
}): JSX.Element {
  const [scrubbing, setScrubbing] = useState(false);
  return (
    <div className="flex shrink-0 items-center gap-3 border-t border-graphite-800 px-4 py-2">
      <button
        type="button"
        onClick={() => {
          // Volver a darle play al final rebobina, en vez de no hacer nada.
          if (!playing && playheadMs >= totalMs) onPlayheadChange(0);
          onPlayingChange(!playing);
        }}
        className="rounded border border-amber-accent px-3 py-1 text-[11px] tracking-widest text-amber-accent uppercase hover:bg-amber-accent hover:text-graphite-950"
      >
        {playing ? '❚❚ Pausa' : '▶ Play'}
      </button>
      <button
        type="button"
        onClick={() => {
          onPlayingChange(false);
          onPlayheadChange(0);
        }}
        className="text-[11px] tracking-widest text-graphite-400 uppercase hover:text-amber-accent"
      >
        ⟲ Inicio
      </button>
      <input
        type="range"
        min={0}
        max={totalMs}
        step={10}
        value={playheadMs}
        onMouseDown={() => {
          setScrubbing(true);
          onPlayingChange(false);
        }}
        onMouseUp={() => setScrubbing(false)}
        onChange={(event) => onPlayheadChange(Number(event.target.value))}
        className="min-w-0 flex-1 accent-amber-accent"
      />
      <span className={`font-mono text-[11px] tabular-nums ${scrubbing ? 'text-amber-accent' : 'text-graphite-400'}`}>
        {(playheadMs / 1000).toFixed(1)} / {(totalMs / 1000).toFixed(1)}s
      </span>
    </div>
  );
}
