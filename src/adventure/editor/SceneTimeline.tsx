import { useRef, useState, type JSX } from 'react';
import type { AudioClip, Scene } from '../../game-engine/scene-engine/schemas';
import { panelSpans, sceneDurationMs } from '../../game-engine/scene-engine/timeline';
import { gameAssetUrl } from '../gameAssetUrl';

/**
 * Línea de tiempo de la escena: la pista de imágenes arriba, la de audio
 * abajo, como en un editor de video.
 *
 * Las dos comparten la misma escala horizontal, y eso es todo el punto: un
 * clip de audio dice cuándo suena respecto de las imágenes, no respecto de un
 * panel. Ver de un vistazo que la lluvia empieza un panel antes de la
 * explosión es algo que ninguna lista de propiedades muestra.
 *
 * Los paneles no se arrastran: su posición es la suma de las duraciones
 * anteriores (ver panelSpans), así que moverlos sería reordenarlos, no
 * desplazarlos. Lo que sí se arrastra es el audio, que sí tiene posición
 * propia.
 */

/** Cuánto ocupa un segundo en pantalla. Fijo y no ajustable por ahora: una
 * cinemática de este guion dura menos de un minuto y entra entera. */
const PX_PER_SECOND = 80;
const MIN_CLIP_PX = 24;

export function SceneTimeline({
  gameId,
  scene,
  playheadMs,
  selectedBackgroundId,
  backgroundCacheBust,
  onSeek,
  onSelectBackground,
  onAddClip,
  onMoveClip,
  onRemoveClip,
  onClipVolumeChange,
}: {
  gameId: string;
  scene: Scene;
  playheadMs: number;
  selectedBackgroundId: string | null;
  backgroundCacheBust: Record<string, number>;
  onSeek: (ms: number) => void;
  onSelectBackground: (bgId: string) => void;
  /** El archivo se sube y se agrega arrancando en `startMs`. */
  onAddClip: (file: File, startMs: number) => void;
  onMoveClip: (clipId: string, startMs: number) => void;
  onRemoveClip: (clipId: string) => void;
  onClipVolumeChange: (clipId: string, volume: number) => void;
}): JSX.Element {
  const trackRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState<{ clipId: string; grabOffsetMs: number } | null>(null);

  const totalMs = Math.max(sceneDurationMs(scene), 1000);
  const spans = panelSpans(scene);
  const widthPx = (totalMs / 1000) * PX_PER_SECOND;

  function msFromEvent(event: { clientX: number }): number {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    const x = event.clientX - rect.left + (trackRef.current?.scrollLeft ?? 0);
    return Math.max(0, Math.round((x / PX_PER_SECOND) * 1000));
  }

  function handleMove(event: React.MouseEvent): void {
    if (!dragging) return;
    // Se resta dónde se agarró el clip para que no salte con el borde
    // izquierdo pegado al cursor.
    onMoveClip(dragging.clipId, Math.max(0, msFromEvent(event) - dragging.grabOffsetMs));
  }

  return (
    <div className="flex h-full flex-col bg-graphite-950">
      <div className="flex shrink-0 items-center gap-2 border-b border-graphite-800 px-3 py-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="rounded border border-amber-accent/60 px-2 py-0.5 text-[10px] tracking-widest text-amber-accent uppercase hover:bg-amber-accent/10"
        >
          ♪ Agregar audio
        </button>
        <span className="text-[10px] text-graphite-500">
          Se agrega donde está la línea de reproducción ({(playheadMs / 1000).toFixed(1)}s) — después se arrastra.
        </span>
        <input
          ref={fileRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onAddClip(file, playheadMs);
            event.target.value = '';
          }}
        />
      </div>

      <div
        ref={trackRef}
        className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden p-3"
        onMouseMove={handleMove}
        onMouseUp={() => setDragging(null)}
        onMouseLeave={() => setDragging(null)}
      >
        <div className="relative" style={{ width: widthPx, minWidth: '100%' }}>
          <Ruler totalMs={totalMs} onSeek={(ms) => onSeek(ms)} />

          {/* Pista de imágenes: cada panel ocupa lo que dura. */}
          <p className="mt-2 mb-1 text-[9px] tracking-widest text-graphite-600 uppercase">Imágenes</p>
          <div className="relative h-16">
            {spans.map(({ background, startMs, durationMs }) => {
              const selected = background.id === selectedBackgroundId;
              const src = background.assetPath.trim()
                ? `${gameAssetUrl(gameId, background.assetPath)}${
                    backgroundCacheBust[background.assetPath] ? `?v=${backgroundCacheBust[background.assetPath]}` : ''
                  }`
                : null;
              return (
                <button
                  key={background.id}
                  type="button"
                  onClick={() => onSelectBackground(background.id)}
                  title={background.caption ?? background.id}
                  className={`absolute top-0 h-16 overflow-hidden rounded border text-left ${
                    selected ? 'border-amber-accent' : 'border-graphite-700 hover:border-graphite-500'
                  }`}
                  style={{
                    left: (startMs / 1000) * PX_PER_SECOND,
                    width: Math.max((durationMs / 1000) * PX_PER_SECOND - 2, MIN_CLIP_PX),
                    backgroundColor: background.backgroundColor ?? '#0b0f14',
                  }}
                >
                  {src && <img src={src} alt="" className="h-full w-full object-cover opacity-80" />}
                  <span className="absolute inset-x-0 bottom-0 truncate bg-graphite-950/80 px-1 text-[8px] text-graphite-300">
                    {background.caption?.split('\n')[0] || background.id}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Pista de audio: posición propia, se arrastra. */}
          <p className="mt-3 mb-1 text-[9px] tracking-widest text-graphite-600 uppercase">Audio</p>
          <div className="relative h-12">
            {scene.audioTrack.map((clip) => (
              <ClipBlock
                key={clip.id}
                clip={clip}
                dragging={dragging?.clipId === clip.id}
                onGrab={(grabOffsetMs) => setDragging({ clipId: clip.id, grabOffsetMs })}
                onRemove={() => onRemoveClip(clip.id)}
                onVolumeChange={(volume) => onClipVolumeChange(clip.id, volume)}
              />
            ))}
            {scene.audioTrack.length === 0 && (
              <p className="pt-3 text-[9px] text-graphite-600">
                Sin audio todavía. Movés la línea de reproducción y agregás un clip ahí.
              </p>
            )}
          </div>

          {/* La línea de reproducción cruza las dos pistas: es lo que deja
              leer "este sonido entra en este panel" de un vistazo. */}
          <div
            className="pointer-events-none absolute top-0 bottom-0 w-px bg-amber-accent"
            style={{ left: (playheadMs / 1000) * PX_PER_SECOND }}
          />
        </div>
      </div>
    </div>
  );
}

function Ruler({ totalMs, onSeek }: { totalMs: number; onSeek: (ms: number) => void }): JSX.Element {
  const seconds = Math.ceil(totalMs / 1000);
  return (
    <div
      className="relative h-5 cursor-pointer border-b border-graphite-800"
      onClick={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        onSeek(Math.max(0, Math.round(((event.clientX - rect.left) / PX_PER_SECOND) * 1000)));
      }}
    >
      {Array.from({ length: seconds + 1 }, (_, second) => (
        <span
          key={second}
          className="absolute top-0 border-l border-graphite-800 pl-1 text-[8px] text-graphite-600"
          style={{ left: second * PX_PER_SECOND }}
        >
          {second}s
        </span>
      ))}
    </div>
  );
}

function ClipBlock({
  clip,
  dragging,
  onGrab,
  onRemove,
  onVolumeChange,
}: {
  clip: AudioClip;
  dragging: boolean;
  onGrab: (grabOffsetMs: number) => void;
  onRemove: () => void;
  onVolumeChange: (volume: number) => void;
}): JSX.Element {
  return (
    <div
      onMouseDown={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        onGrab(Math.round(((event.clientX - rect.left) / PX_PER_SECOND) * 1000));
      }}
      title={`${clip.label || clip.path} — ${(clip.durationMs / 1000).toFixed(1)}s`}
      className={`absolute top-0 flex h-12 cursor-grab flex-col justify-between overflow-hidden rounded border px-1 py-0.5 ${
        dragging ? 'border-amber-accent bg-amber-accent/20' : 'border-sky-500/60 bg-sky-500/15 hover:border-sky-400'
      }`}
      style={{
        left: (clip.startMs / 1000) * PX_PER_SECOND,
        // Un clip cuya duración todavía no se midió igual tiene que poder
        // agarrarse y moverse, así que nunca baja de un ancho mínimo.
        width: Math.max((clip.durationMs / 1000) * PX_PER_SECOND, MIN_CLIP_PX),
      }}
    >
      <span className="truncate text-[8px] text-sky-200">{clip.label || clip.path.split('/').pop()}</span>
      <div className="flex items-center gap-1">
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={clip.volume}
          onMouseDown={(event) => event.stopPropagation()}
          onChange={(event) => onVolumeChange(Number(event.target.value))}
          className="h-1 w-10 accent-sky-400"
        />
        <button
          type="button"
          onMouseDown={(event) => event.stopPropagation()}
          onClick={onRemove}
          className="text-[8px] text-graphite-400 hover:text-red-400"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
