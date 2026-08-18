import { useRef, useState, type ChangeEvent, type JSX } from 'react';
import type { FontFamily, PolygonPoint, SiteSettings, TextStyle } from '../../game-engine/scene-engine/schemas';
import { gameAssetUrl } from '../gameAssetUrl';
import { PolygonPointEditor } from './PolygonPointEditor';

const inputClassName =
  'w-full rounded border border-graphite-700 bg-graphite-900 px-1.5 py-1 text-[10px] text-graphite-100';

function ImageSlot({
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

export type ActionMenuImageKind = 'normal' | 'examine' | 'interact' | 'interactWith' | 'close';
export type ActionMenuZoneKey = 'examineZone' | 'interactZone' | 'interactWithZone' | 'closeZone';

const ACTION_MENU_ZONE_LABELS: Record<ActionMenuZoneKey, string> = {
  examineZone: 'Examinar',
  interactZone: 'Interactuar',
  interactWithZone: 'Interactuar con',
  closeZone: 'Cerrar',
};
const ZONE_KEYS = Object.keys(ACTION_MENU_ZONE_LABELS) as ActionMenuZoneKey[];

/**
 * Traza las 4 zonas clickeables (libres, no un layout fijo) sobre la
 * imagen "normal" del menú de acción — mismo mecanismo que las zonas de
 * forma libre sobre objetos de la escena (PolygonPointEditor), pero en un
 * mini-stage propio del panel de Ajustes.
 */
function ActionMenuZoneEditor({
  gameId,
  normalImagePath,
  zones,
  onZoneChange,
}: {
  gameId: string;
  normalImagePath: string;
  zones: Record<ActionMenuZoneKey, PolygonPoint[]>;
  onZoneChange: (zoneKey: ActionMenuZoneKey, points: PolygonPoint[]) => void;
}): JSX.Element {
  const stageRef = useRef<HTMLDivElement>(null);
  const [tracingKey, setTracingKey] = useState<ActionMenuZoneKey | null>(null);
  const [tracingPoints, setTracingPoints] = useState<PolygonPoint[]>([]);

  function startTracing(key: ActionMenuZoneKey): void {
    setTracingKey(key);
    setTracingPoints([]);
  }

  function closeTrace(): void {
    if (!tracingKey || tracingPoints.length < 3) return;
    onZoneChange(tracingKey, tracingPoints);
    setTracingKey(null);
    setTracingPoints([]);
  }

  return (
    <div className="mt-2">
      <p className="mb-2 text-[9px] text-graphite-500">
        Elegí qué zona trazar y hacé click sobre la imagen para ir marcando el contorno — cerrá haciendo click cerca
        del primer punto (mínimo 3).
      </p>
      <div
        ref={stageRef}
        className="relative mb-2 w-full max-w-[320px] overflow-hidden rounded border border-graphite-700 bg-graphite-950"
      >
        <img src={gameAssetUrl(gameId, normalImagePath)} alt="" className="block w-full" draggable={false} />
        {ZONE_KEYS.filter((key) => key !== tracingKey).map((key) => {
          const points = zones[key];
          if (points.length < 3) return null;
          return (
            <PolygonPointEditor
              key={key}
              points={points}
              closed
              stageRef={stageRef}
              label={ACTION_MENU_ZONE_LABELS[key]}
              onChange={(newPoints) => onZoneChange(key, newPoints)}
            />
          );
        })}
        {tracingKey && (
          <PolygonPointEditor
            points={tracingPoints}
            closed={false}
            stageRef={stageRef}
            label={ACTION_MENU_ZONE_LABELS[tracingKey]}
            onAddPoint={(point) => setTracingPoints((prev) => [...prev, point])}
            onClose={closeTrace}
          />
        )}
      </div>
      {tracingKey ? (
        <div className="mb-2 rounded border border-amber-accent/40 bg-graphite-900/60 p-2">
          <p className="mb-2 text-[9px] tracking-widest text-amber-accent uppercase">
            Trazando {ACTION_MENU_ZONE_LABELS[tracingKey]} ({tracingPoints.length} puntos)
          </p>
          <button
            type="button"
            onClick={() => setTracingKey(null)}
            className="w-full rounded border border-graphite-700 px-2 py-1 text-[9px] tracking-widest text-graphite-300 uppercase transition-colors hover:border-amber-accent hover:text-amber-accent"
          >
            Cancelar
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-1">
          {ZONE_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => startTracing(key)}
              className="rounded border border-graphite-700 px-2 py-1 text-[9px] tracking-widest text-graphite-300 uppercase transition-colors hover:border-amber-accent hover:text-amber-accent"
            >
              {zones[key].length >= 3 ? 'Retrazar' : 'Trazar'}: {ACTION_MENU_ZONE_LABELS[key]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Ajustes generales del juego: tipografía por defecto del tooltip de
 * hotspot, el cursor del mouse, y el menú de acción (Examinar/Interactuar/
 * Interactuar con/Cerrar). Esto es una plataforma para varios juegos, así
 * que nada de esto debería quedar fijo — cada juego define lo suyo acá.
 */
export function SiteSettingsPanel({
  gameId,
  settings,
  uploadingCursor,
  uploadingActionMenuImage,
  onChangeHotspotLabelStyle,
  onUploadCursor,
  onRemoveCursor,
  onUploadActionMenuImage,
  onRemoveActionMenuImage,
  onActionMenuZoneChange,
}: {
  gameId: string;
  settings: SiteSettings;
  uploadingCursor: 'default' | 'hover' | null;
  uploadingActionMenuImage: ActionMenuImageKind | null;
  onChangeHotspotLabelStyle: (patch: Partial<TextStyle>) => void;
  onUploadCursor: (kind: 'default' | 'hover', file: File) => void;
  onRemoveCursor: (kind: 'default' | 'hover') => void;
  onUploadActionMenuImage: (kind: ActionMenuImageKind, file: File) => void;
  onRemoveActionMenuImage: (kind: ActionMenuImageKind) => void;
  onActionMenuZoneChange: (zoneKey: ActionMenuZoneKey, points: PolygonPoint[]) => void;
}): JSX.Element {
  const style = settings.hotspotLabelStyle;
  const actionMenu = settings.actionMenu;

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
      <ImageSlot
        gameId={gameId}
        label="Por defecto"
        path={settings.cursor.defaultCursorPath}
        uploading={uploadingCursor === 'default'}
        onUpload={(file) => onUploadCursor('default', file)}
        onRemove={() => onRemoveCursor('default')}
      />
      <ImageSlot
        gameId={gameId}
        label="Sobre zona interactuable"
        path={settings.cursor.hoverCursorPath}
        uploading={uploadingCursor === 'hover'}
        onUpload={(file) => onUploadCursor('hover', file)}
        onRemove={() => onRemoveCursor('hover')}
      />

      <p className="mt-3 mb-2 text-[10px] font-semibold tracking-widest text-graphite-300 uppercase">Menú de acción</p>
      <p className="mb-2 text-[9px] text-graphite-500">
        Las 4 funciones que tiene cualquier point-and-click: Examinar, Interactuar, Interactuar con, y Cerrar. La
        imagen "normal" aparece al primer click sobre un objeto con el menú activado; cada acción tiene su propia
        imagen que la reemplaza al pasar el mouse sobre su zona.
      </p>
      <ImageSlot
        gameId={gameId}
        label="Normal (estado inicial)"
        path={actionMenu.normalImagePath}
        uploading={uploadingActionMenuImage === 'normal'}
        onUpload={(file) => onUploadActionMenuImage('normal', file)}
        onRemove={() => onRemoveActionMenuImage('normal')}
      />
      <ImageSlot
        gameId={gameId}
        label="Examinar"
        path={actionMenu.examineImagePath}
        uploading={uploadingActionMenuImage === 'examine'}
        onUpload={(file) => onUploadActionMenuImage('examine', file)}
        onRemove={() => onRemoveActionMenuImage('examine')}
      />
      <ImageSlot
        gameId={gameId}
        label="Interactuar"
        path={actionMenu.interactImagePath}
        uploading={uploadingActionMenuImage === 'interact'}
        onUpload={(file) => onUploadActionMenuImage('interact', file)}
        onRemove={() => onRemoveActionMenuImage('interact')}
      />
      <ImageSlot
        gameId={gameId}
        label="Interactuar con"
        path={actionMenu.interactWithImagePath}
        uploading={uploadingActionMenuImage === 'interactWith'}
        onUpload={(file) => onUploadActionMenuImage('interactWith', file)}
        onRemove={() => onRemoveActionMenuImage('interactWith')}
      />
      <ImageSlot
        gameId={gameId}
        label="Cerrar"
        path={actionMenu.closeImagePath}
        uploading={uploadingActionMenuImage === 'close'}
        onUpload={(file) => onUploadActionMenuImage('close', file)}
        onRemove={() => onRemoveActionMenuImage('close')}
      />

      {actionMenu.normalImagePath && (
        <ActionMenuZoneEditor
          gameId={gameId}
          normalImagePath={actionMenu.normalImagePath}
          zones={{
            examineZone: actionMenu.examineZone,
            interactZone: actionMenu.interactZone,
            interactWithZone: actionMenu.interactWithZone,
            closeZone: actionMenu.closeZone,
          }}
          onZoneChange={onActionMenuZoneChange}
        />
      )}

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
