import type { JSX } from 'react';
import type { FontFamily, SiteSettings, TextStyle } from '../../game-engine/scene-engine/schemas';

const inputClassName =
  'w-full rounded border border-graphite-700 bg-graphite-900 px-1.5 py-1 text-[10px] text-graphite-100';

/**
 * Ajustes generales del juego (hoy: tipografía por defecto del tooltip de
 * hotspot). Cualquier zona puede pisar estos valores puntualmente desde su
 * propio panel en la pestaña Escena — ver ObjectFields.
 */
export function SiteSettingsPanel({
  settings,
  onChangeHotspotLabelStyle,
}: {
  settings: SiteSettings;
  onChangeHotspotLabelStyle: (patch: Partial<TextStyle>) => void;
}): JSX.Element {
  const style = settings.hotspotLabelStyle;

  return (
    <div className="text-xs text-graphite-200">
      <p className="mb-3 text-[10px] text-graphite-400">
        Valores por defecto para todo el juego. Cualquier zona puede pisar esto con su propio estilo desde el panel
        Escena.
      </p>

      <p className="mb-2 text-[10px] font-semibold tracking-widest text-graphite-300 uppercase">
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
