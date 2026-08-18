import { useState, type CSSProperties, type JSX } from 'react';
import { gameAssetUrl } from './gameAssetUrl';

const GLOW_FILTER =
  'drop-shadow(0 0 6px rgba(224,166,54,0.9)) drop-shadow(0 0 16px rgba(224,166,54,0.55))';

/**
 * Capa de escena tolerante a arte faltante: si `assetPath` no existe todavía
 * en assets/games/<gameId>/, cae a un bloque con la ruta como etiqueta en
 * vez de romper el render.
 *
 * `glow`: en vez de resaltar el hotspot con un rectángulo, aplicamos un
 * drop-shadow — para un PNG con transparencia eso sigue la silueta real del
 * objeto, no su bounding box.
 */
export function PlaceholderLayer({
  gameId,
  assetPath,
  style,
  className = '',
  glow = false,
}: {
  gameId: string;
  assetPath: string;
  style?: CSSProperties;
  className?: string;
  glow?: boolean;
}): JSX.Element {
  const [failed, setFailed] = useState(false);

  const glowStyle: CSSProperties = {
    filter: glow ? GLOW_FILTER : 'none',
    transition: 'filter 150ms ease-out',
  };

  if (failed) {
    return (
      <div
        style={{ ...style, ...glowStyle }}
        className={`flex items-center justify-center rounded border border-dashed border-graphite-600 bg-graphite-800/70 px-2 text-center text-[10px] tracking-wide text-graphite-400 uppercase ${className}`}
      >
        {assetPath}
      </div>
    );
  }

  return (
    <img
      src={gameAssetUrl(gameId, assetPath)}
      alt=""
      style={{ ...style, ...glowStyle }}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
