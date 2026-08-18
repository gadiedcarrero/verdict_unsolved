import { useRef, useState, type ChangeEvent, type JSX } from 'react';
import type { FontFamily, SiteSettings, TextStyle } from '../../game-engine/scene-engine/schemas';
import { gameAssetUrl } from '../gameAssetUrl';

const inputClassName =
  'w-full rounded border border-graphite-700 bg-graphite-900 px-1.5 py-1 text-[10px] text-graphite-100';

function CursorSlot({
  gameId,
  label,
  path,
  uploading,
  onUpload,
  onRemove,
}: {
  gameId: string;
  label: string;
  path: string | null;
  uploading: boolean;
  onUpload: (file: File) => void;
  onRemove: () => void;
}): JSX.Element {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [failed, setFailed] = useState(false);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0];
    if (file) onUpload(file);
    event.target.value = '';
  }

  return (
    <div className="mb-2 flex items-center gap-2">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-dashed border-graphite-600 bg-graphite-900">
        {path && !failed ? (
          <img
            src={gameAssetUrl(gameId, path)}
            alt=""
            onError={() => setFailed(true)}
            className="max-h-full max-w-full"
          />
        ) : (
          <span className="text-[8px] text-graphite-500">—</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="mb-1 truncate text-[9px] text-graphite-500 uppercase">{label}</p>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex-1 rounded border border-graphite-700 px-2 py-1 text-[9px] tracking-widest text-graphite-300 uppercase transition-colors hover:border-amber-accent hover:text-amber-accent disabled:opacity-40"
          >
            {uploading ? 'Subiendo...' : path ? 'Cambiar' : 'Subir imagen'}
          </button>
          {path && (
            <button
              type="button"
              onClick={onRemove}
              className="rounded border border-graphite-700 px-2 py-1 text-[9px] tracking-widest text-graphite-400 uppercase transition-colors hover:border-amber-accent hover:text-amber-accent"
            >
              Quitar
            </button>
          )}
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
      </div>
    </div>
  );
}

/**
 * Ajustes generales del juego: tipografía por defecto del tooltip de
 * hotspot, y el cursor del mouse. Esto es una plataforma para varios
 * juegos, así que ni la tipografía ni el cursor deberían quedar fijos —
 * cada juego define los suyos acá (y cada zona puede pisar el estilo del
 * tooltip puntualmente desde su propio panel en la pestaña Escena).
 */
export function SiteSettingsPanel({
  gameId,
  settings,
  uploadingCursor,
  onChangeHotspotLabelStyle,
  onUploadCursor,
  onRemoveCursor,
}: {
  gameId: string;
  settings: SiteSettings;
  uploadingCursor: 'default' | 'hover' | null;
  onChangeHotspotLabelStyle: (patch: Partial<TextStyle>) => void;
  onUploadCursor: (kind: 'default' | 'hover', file: File) => void;
  onRemoveCursor: (kind: 'default' | 'hover') => void;
}): JSX.Element {
  const style = settings.hotspotLabelStyle;

  return (
    <div className="text-xs text-graphite-200">
      <p className="mb-3 text-[10px] text-graphite-400">
        Valores por defecto para todo el juego. Cualquier zona puede pisar esto con su propio estilo desde el panel
        Escena.
      </p>

      <p className="mb-2 text-[10px] font-semibold tracking-widest text-graphite-300 uppercase">Cursor</p>
      <p className="mb-2 text-[9px] text-graphite-500">
        Sin imagen = flecha normal del sistema. El de "sobre zona" se ve al pasar el mouse sobre cualquier zona
        interactuable.
      </p>
      <CursorSlot
        gameId={gameId}
        label="Por defecto"
        path={settings.cursor.defaultCursorPath}
        uploading={uploadingCursor === 'default'}
        onUpload={(file) => onUploadCursor('default', file)}
        onRemove={() => onRemoveCursor('default')}
      />
      <CursorSlot
        gameId={gameId}
        label="Sobre zona interactuable"
        path={settings.cursor.hoverCursorPath}
        uploading={uploadingCursor === 'hover'}
        onUpload={(file) => onUploadCursor('hover', file)}
        onRemove={() => onRemoveCursor('hover')}
      />

      <p className="mt-3 mb-2 text-[10px] font-semibold tracking-widest text-graphite-300 uppercase">
        Texto al pasar el mouse (hotspots)
      </p>

      <label className="mb-2 flex flex-col">
        <span className="text-[9px] text-graphite-500 uppercase">Tipografía</span>
        <select
          value={style.fontFamily}
          onChange={(event) => onChangeHotspotLabelStyle({ fontFamily: event.target.value as FontFamily })}
          className={inputClassName}
        >
          <option value="sans">Sans</option>
          <option value="serif">Serif</option>
          <option value="mono">Monoespaciada</option>
          <option value="comic-sans">Comic Sans</option>
        </select>
      </label>

      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col">
          <span className="text-[9px] text-graphite-500 uppercase">Tamaño</span>
          <input
            type="number"
            min={8}
            max={48}
            value={style.fontSize}
            onChange={(event) => onChangeHotspotLabelStyle({ fontSize: Number(event.target.value) })}
            className={inputClassName}
          />
        </label>
        <label className="flex flex-col">
          <span className="text-[9px] text-graphite-500 uppercase">Color</span>
          <input
            type="color"
            value={style.color}
            onChange={(event) => onChangeHotspotLabelStyle({ color: event.target.value })}
            className="h-7 w-full cursor-pointer rounded border border-graphite-700 bg-graphite-900"
          />
        </label>
      </div>
    </div>
  );
}
