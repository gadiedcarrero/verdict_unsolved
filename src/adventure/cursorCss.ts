import { gameAssetUrl } from './gameAssetUrl';

/** Valor de CSS `cursor` para una imagen subida (o undefined = cursor normal). */
export function cursorCssValue(gameId: string, path: string | null, fallback: string): string | undefined {
  if (!path) return undefined;
  return `url("${gameAssetUrl(gameId, path)}"), ${fallback}`;
}
