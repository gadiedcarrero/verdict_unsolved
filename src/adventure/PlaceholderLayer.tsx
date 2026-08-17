import { useState, type CSSProperties, type JSX } from 'react';

const CASE_ASSET_BASE = '/cases/case-001-la-ultima-llamada';

function resolveAssetUrl(relativePath: string): string {
  return `${CASE_ASSET_BASE}/${relativePath}`;
}

/**
 * Capa de escena tolerante a arte faltante: si `assetPath` no existe todavía
 * en /assets/cases/case-001-la-ultima-llamada/, cae a un bloque con la ruta
 * como etiqueta en vez de romper el render. Ver
 * docs/case-001-la-ultima-llamada/02-manifiesto-assets.md.
 */
export function PlaceholderLayer({
  assetPath,
  style,
  className = '',
}: {
  assetPath: string;
  style?: CSSProperties;
  className?: string;
}): JSX.Element {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        style={style}
        className={`flex items-center justify-center rounded border border-dashed border-graphite-600 bg-graphite-800/70 px-2 text-center text-[10px] tracking-wide text-graphite-400 uppercase ${className}`}
      >
        {assetPath}
      </div>
    );
  }

  return (
    <img
      src={resolveAssetUrl(assetPath)}
      alt=""
      style={style}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
