import { useRef, useState, type JSX } from 'react';
import type { AudioClip, AudioTrack, Scene } from '../../game-engine/scene-engine/schemas';
import { panelSpans, sceneDurationMs } from '../../game-engine/scene-engine/timeline';
import { gameAssetUrl } from '../gameAssetUrl';

/**
 * Línea de tiempo de la escena: la pista de imágenes arriba, las de audio
 * abajo, como en un editor de video.
 *
 * Todas comparten la misma escala horizontal, y eso es todo el punto: un clip
 * dice cuándo suena respecto de las imágenes, no respecto de un panel. Ver de
 * un vistazo que la lluvia empieza un panel antes de la explosión es algo que
 * ninguna lista de propiedades muestra.
 *
 * Los paneles no se arrastran: su posición es la suma de las duraciones
 * anteriores (ver panelSpans), así que moverlos sería reordenarlos, no
 * desplazarlos. Lo que sí se arrastra es el audio, que tiene posición propia.
 */

const ZOOM_LEVELS = [20, 40, 80, 160, 320, 640];
const DEFAULT_ZOOM_INDEX = 2;
const MIN_CLIP_PX = 24;
/** Ancho de la columna de cabeceras de pista, a la izquierda del tiempo. */
const HEADER_PX = 128;

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
  onAddTrack,
  onRemoveTrack,
  onTrackChange,
}: {
  gameId: string;
  scene: Scene;
  playheadMs: number;
  selectedBackgroundId: string | null;
  backgroundCacheBust: Record<string, number>;
  onSeek: (ms: number) => void;
  onSelectBackground: (bgId: string) => void;
  onAddClip: (trackId: string, file: File, startMs: number) => void;
  onMoveClip: (trackId: string, clipId: string, startMs: number) => void;
  onRemoveClip: (trackId: string, clipId: string) => void;
  onClipVolumeChange: (trackId: string, clipId: string, volume: number) => void;
  onAddTrack: () => void;
  onRemoveTrack: (trackId: string) => void;
  onTrackChange: (trackId: string, patch: Partial<AudioTrack>) => void;
}): JSX.Element {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [zoomIndex, setZoomIndex] = useState(DEFAULT_ZOOM_INDEX);
  const [dragging, setDragging] = useState<{ trackId: string; clipId: string; grabOffsetMs: number } | null>(null);

  const pxPerSecond = ZOOM_LEVELS[zoomIndex]!;
  const totalMs = Math.max(sceneDurationMs(scene), 4000);
  const spans = panelSpans(scene);
  const widthPx = (totalMs / 1000) * pxPerSecond;

  const msToPx = (ms: number): number => (ms / 1000) * pxPerSecond;
  const pxToMs = (px: number): number => Math.max(0, Math.round((px / pxPerSecond) * 1000));

  function msFromClientX(clientX: number): number {
    const el = scrollRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    return pxToMs(clientX - rect.left - HEADER_PX + el.scrollLeft);
  }

  /** Ctrl/⌘ + rueda hace zoom en vez de scrollear, como en Premiere, y
   * mantiene bajo el cursor el mismo instante: sin eso, acercarse a un clip
   * lo saca de pantalla y hay que volver a buscarlo. */
  function handleWheel(event: React.WheelEvent): void {
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    const el = scrollRef.current;
    if (!el) return;
    const anchorMs = msFromClientX(event.clientX);
    const next = Math.min(ZOOM_LEVELS.length - 1, Math.max(0, zoomIndex + (event.deltaY < 0 ? 1 : -1)));
    if (next === zoomIndex) return;
    const pointerOffsetPx = event.clientX - el.getBoundingClientRect().left - HEADER_PX;
    setZoomIndex(next);
    requestAnimationFrame(() => {
      el.scrollLeft = (anchorMs / 1000) * ZOOM_LEVELS[next]! - pointerOffsetPx;
    });
  }

  return (
    <div className="flex h-full flex-col bg-graphite-950" onWheel={handleWheel}>
      <div className="flex shrink-0 items-center gap-2 border-b border-graphite-800 px-3 py-2">
        <button
          type="button"
          onClick={onAddTrack}
          className="rounded border border-amber-accent/60 px-2 py-0.5 text-[10px] tracking-widest text-amber-accent uppercase hover:bg-amber-accent/10"
        >
          + Pista
        </button>
        <span className="flex-1 text-[10px] text-graphite-500">
          Cabeza en {(playheadMs / 1000).toFixed(1)}s — ⌘/Ctrl + rueda para hacer zoom.
        </span>
        <button
          type="button"
          onClick={() => setZoomIndex((i) => Math.max(0, i - 1))}
          disabled={zoomIndex === 0}
          className="rounded border border-graphite-700 px-2 text-[11px] text-graphite-400 hover:border-amber-accent disabled:opacity-30"
        >
          −
        </button>
        <span className="w-12 text-center font-mono text-[9px] text-graphite-500">{pxPerSecond}px/s</span>
        <button
          type="button"
          onClick={() => setZoomIndex((i) => Math.min(ZOOM_LEVELS.length - 1, i + 1))}
          disabled={zoomIndex === ZOOM_LEVELS.length - 1}
          className="rounded border border-graphite-700 px-2 text-[11px] text-graphite-400 hover:border-amber-accent disabled:opacity-30"
        >
          +
        </button>
      </div>

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-auto"
        onMouseMove={(event) => {
          if (!dragging) return;
          onMoveClip(dragging.trackId, dragging.clipId, Math.max(0, msFromClientX(event.clientX) - dragging.grabOffsetMs));
        }}
        onMouseUp={() => setDragging(null)}
        onMouseLeave={() => setDragging(null)}
      >
        {/* Cabeceras fijas a la izquierda + contenido que scrollea: el nombre
            de la pista tiene que seguir visible cuando se navega el tiempo. */}
        <div className="relative" style={{ width: HEADER_PX + widthPx, minWidth: '100%' }}>
          <Ruler
            totalMs={totalMs}
            pxPerSecond={pxPerSecond}
            onSeek={(clientX) => onSeek(msFromClientX(clientX))}
          />

          <TrackRow label="Imágenes">
            <div className="relative h-16" style={{ width: widthPx }}>
              {spans.map(({ background, startMs, durationMs }) => {
                const selected = background.id === selectedBackgroundId;
                const src = background.assetPath.trim()
                  ? `${gameAssetUrl(gameId, background.assetPath)}${
                      backgroundCacheBust[background.assetPath]
                        ? `?v=${backgroundCacheBust[background.assetPath]}`
                        : ''
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
                      left: msToPx(startMs),
                      width: Math.max(msToPx(durationMs) - 2, MIN_CLIP_PX),
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
          </TrackRow>

          {scene.audioTracks.map((track) => (
            <TrackRow
              key={track.id}
              label={track.label || track.id}
              track={track}
              onTrackChange={(patch) => onTrackChange(track.id, patch)}
              onRemove={() => onRemoveTrack(track.id)}
              onAddClip={(file) => onAddClip(track.id, file, playheadMs)}
            >
              <div className="relative h-12" style={{ width: widthPx }}>
                {track.clips.map((clip) => (
                  <ClipBlock
                    key={clip.id}
                    clip={clip}
                    loop={track.loop}
                    muted={track.muted}
                    left={msToPx(clip.startMs)}
                    width={Math.max(msToPx(clip.durationMs), MIN_CLIP_PX)}
                    dragging={dragging?.clipId === clip.id}
                    onGrab={(grabPx) =>
                      setDragging({ trackId: track.id, clipId: clip.id, grabOffsetMs: pxToMs(grabPx) })
                    }
                    onRemove={() => onRemoveClip(track.id, clip.id)}
                    onVolumeChange={(volume) => onClipVolumeChange(track.id, clip.id, volume)}
                  />
                ))}
              </div>
            </TrackRow>
          ))}

          {scene.audioTracks.length === 0 && (
            <p className="px-3 py-4 text-[10px] text-graphite-600">
              Sin pistas de audio. Agregá una con “+ Pista” — marcala como loop para una cama de ambiente o música.
            </p>
          )}

          {/* La cabeza cruza todas las pistas: es lo que deja leer "este
              sonido entra en este panel" de un vistazo. */}
          <div
            className="pointer-events-none absolute top-0 bottom-0 w-px bg-amber-accent"
            style={{ left: HEADER_PX + msToPx(playheadMs) }}
          />
        </div>
      </div>
    </div>
  );
}

/** Una fila: cabecera fija a la izquierda, contenido en la escala de tiempo. */
function TrackRow({
  label,
  track,
  children,
  onTrackChange,
  onRemove,
  onAddClip,
}: {
  label: string;
  track?: AudioTrack;
  children: JSX.Element;
  onTrackChange?: (patch: Partial<AudioTrack>) => void;
  onRemove?: () => void;
  onAddClip?: (file: File) => void;
}): JSX.Element {
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <div className="flex border-b border-graphite-900">
      <div
        className="sticky left-0 z-10 flex shrink-0 flex-col justify-center gap-1 border-r border-graphite-800 bg-graphite-950 px-2 py-1"
        style={{ width: HEADER_PX }}
      >
        {track && onTrackChange ? (
          <input
            value={track.label}
            onChange={(event) => onTrackChange({ label: event.target.value })}
            className="w-full rounded border border-transparent bg-transparent text-[9px] text-graphite-200 hover:border-graphite-700 focus:border-amber-accent focus:outline-none"
          />
        ) : (
          <span className="text-[9px] tracking-widest text-graphite-500 uppercase">{label}</span>
        )}
        {track && onTrackChange && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onTrackChange({ loop: !track.loop })}
              title="Repetir sus clips mientras dure la escena"
              className={`rounded border px-1 text-[8px] ${
                track.loop ? 'border-amber-accent text-amber-accent' : 'border-graphite-700 text-graphite-500'
              }`}
            >
              ⟳ loop
            </button>
            <button
              type="button"
              onClick={() => onTrackChange({ muted: !track.muted })}
              title="Silenciar sin borrar"
              className={`rounded border px-1 text-[8px] ${
                track.muted ? 'border-red-500/60 text-red-400' : 'border-graphite-700 text-graphite-500'
              }`}
            >
              {track.muted ? '🔇' : '🔊'}
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              title="Agregar un clip donde está la cabeza"
              className="rounded border border-graphite-700 px-1 text-[8px] text-graphite-500 hover:border-amber-accent hover:text-amber-accent"
            >
              ＋
            </button>
            <button type="button" onClick={onRemove} className="text-[8px] text-graphite-600 hover:text-red-400">
              ✕
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) onAddClip?.(file);
                event.target.value = '';
              }}
            />
          </div>
        )}
      </div>
      <div className="py-1">{children}</div>
    </div>
  );
}

function Ruler({
  totalMs,
  pxPerSecond,
  onSeek,
}: {
  totalMs: number;
  pxPerSecond: number;
  onSeek: (clientX: number) => void;
}): JSX.Element {
  const seconds = Math.ceil(totalMs / 1000);
  // Con mucho zoom out, una marca por segundo se vuelve ilegible.
  const step = pxPerSecond < 40 ? 5 : pxPerSecond < 80 ? 2 : 1;
  return (
    <div className="flex border-b border-graphite-800">
      <div className="sticky left-0 z-10 shrink-0 bg-graphite-950" style={{ width: HEADER_PX }} />
      <div
        className="relative h-5 cursor-pointer"
        style={{ width: (totalMs / 1000) * pxPerSecond }}
        onClick={(event) => onSeek(event.clientX)}
      >
        {Array.from({ length: Math.floor(seconds / step) + 1 }, (_, i) => i * step).map((second) => (
          <span
            key={second}
            className="absolute top-0 border-l border-graphite-800 pl-1 text-[8px] text-graphite-600"
            style={{ left: second * pxPerSecond }}
          >
            {second}s
          </span>
        ))}
      </div>
    </div>
  );
}

function ClipBlock({
  clip,
  loop,
  muted,
  left,
  width,
  dragging,
  onGrab,
  onRemove,
  onVolumeChange,
}: {
  clip: AudioClip;
  loop: boolean;
  muted: boolean;
  left: number;
  width: number;
  dragging: boolean;
  onGrab: (grabPx: number) => void;
  onRemove: () => void;
  onVolumeChange: (volume: number) => void;
}): JSX.Element {
  return (
    <div
      onMouseDown={(event) => onGrab(event.clientX - event.currentTarget.getBoundingClientRect().left)}
      title={`${clip.label || clip.path} — ${(clip.durationMs / 1000).toFixed(1)}s${loop ? ' (en loop)' : ''}`}
      className={`absolute top-0 flex h-12 cursor-grab flex-col justify-between overflow-hidden rounded border px-1 py-0.5 ${
        muted ? 'opacity-40' : ''
      } ${dragging ? 'border-amber-accent bg-amber-accent/20' : 'border-sky-500/60 bg-sky-500/15 hover:border-sky-400'}`}
      style={{ left, width }}
    >
      <span className="truncate text-[8px] text-sky-200">
        {loop && '⟳ '}
        {clip.label || clip.path.split('/').pop()}
      </span>
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
