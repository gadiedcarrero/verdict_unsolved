/**
 * Cada juego sirve su arte desde assets/games/<gameId>/, publicado por Vite
 * en /games/<gameId>/ (ver `publicDir` en electron.vite.config.ts). Antes
 * había una sola base fija porque solo existía un juego; ahora depende de
 * cuál esté abierto en el editor/runtime.
 */
export function gameAssetUrl(gameId: string, relativePath: string): string {
  return `/games/${gameId}/${relativePath}`;
}
