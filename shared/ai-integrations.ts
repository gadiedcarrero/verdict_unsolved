/**
 * Shared between the Electron main process and the renderer (via preload).
 * Kept dependency-free and framework-agnostic on purpose — mismo criterio
 * que save-data.ts.
 *
 * Config global (no por juego): las API keys de estos proveedores valen
 * para toda la plataforma, no para un juego puntual — no tiene sentido
 * cargar la misma key de OpenAI en cada proyecto por separado. Se guarda
 * fuera del repositorio (ver electron/main/ipc/aiIntegrationsHandlers.ts,
 * usa app.getPath('userData')) para que una key real nunca termine
 * commiteada a git sin querer.
 */
export type AiIntegrationsConfig = {
  /** Guion (pulido de texto) e imágenes/voz de OpenAI. */
  openaiApiKey: string | null;
  /** Voz premium de personajes. */
  elevenLabsApiKey: string | null;
  /** fal.ai — agregador real (pago por uso, no una suscripción envoltorio):
   * cubre generación de imagen (Nano Banana y otros) y de video (Seedance y
   * otros) con una sola key, en vez de una por modelo/proveedor. */
  falApiKey: string | null;
};

export function createEmptyAiIntegrationsConfig(): AiIntegrationsConfig {
  return {
    openaiApiKey: null,
    elevenLabsApiKey: null,
    falApiKey: null,
  };
}

export function isAiIntegrationsConfig(value: unknown): value is AiIntegrationsConfig {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  const isKey = (x: unknown): boolean => x === null || typeof x === 'string';
  return isKey(v['openaiApiKey']) && isKey(v['elevenLabsApiKey']) && isKey(v['falApiKey']);
}
