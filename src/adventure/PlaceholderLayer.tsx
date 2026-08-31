import { useEffect, useRef, useState, type CSSProperties, type JSX } from 'react';
import { gameAssetUrl } from './gameAssetUrl';

const GLOW_FILTER =
  'drop-shadow(0 0 6px rgba(224,166,54,0.9)) drop-shadow(0 0 16px rgba(224,166,54,0.55))';

// "Guardar cambios" recarga la página entera ~400ms después de escribir el
// archivo (ver reloadAfterSave en AdventureRuntime.tsx) — ese margen le
// alcanza casi siempre a Vite/Electron para notar el .json de la escena,
// pero un fondo/objeto recién generado por IA puede tardar más en quedar
// visible para quien sirve los assets. Sin reintento, un solo 404
// transitorio justo después de recargar dejaba esta capa marcada como "arte
// faltante" para siempre, aunque el archivo estuviera perfectamente bien en
// disco — de ahí que pareciera que guardar "borraba" las imágenes.
const MAX_LOAD_RETRIES = 5;
const RETRY_DELAY_MS = 500;

/**
 * Capa de escena tolerante a arte faltante: si `assetPath` no existe todavía
 * en assets/games/<gameId>/, cae a un bloque con la ruta como etiqueta en
 * vez de romper el render. Antes de darse por vencida, reintenta varias
 * veces con backoff (ver comentario arriba) — recién si sigue fallando
 * después de esos reintentos asume que el arte realmente falta.
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
  const [retryToken, setRetryToken] = useState(0);
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    retryCountRef.current = 0;
    setFailed(false);
    setRetryToken(0);
    return () => {
      if (retryTimeoutRef.current !== null) window.clearTimeout(retryTimeoutRef.current);
    };
  }, [assetPath]);

  function handleError(): void {
    if (retryCountRef.current >= MAX_LOAD_RETRIES) {
      setFailed(true);
      return;
    }
    retryCountRef.current += 1;
    retryTimeoutRef.current = window.setTimeout(() => {
      setRetryToken((t) => t + 1);
    }, RETRY_DELAY_MS * retryCountRef.current);
  }

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

  const src = gameAssetUrl(gameId, assetPath);
  return (
    <img
      key={retryToken}
      src={retryToken ? `${src}?v=${retryToken}` : src}
      alt=""
      style={{ ...style, ...glowStyle }}
      className={className}
      onError={handleError}
    />
  );
}
