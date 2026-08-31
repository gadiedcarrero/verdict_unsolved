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

/** Qué motor usar para generar retratos/fondos con IA. "nano-banana" (fal.ai)
 * y "openai" (gpt-image-1) son servicios pagos con moderación de contenido
 * propia de cada proveedor. "comfyui" corre 100% en esta máquina (SDXL vía
 * un servidor ComfyUI local, ver comfyuiBaseUrl) — no necesita ninguna key,
 * no depende de internet una vez descargados los modelos, y no tiene
 * moderación de contenido propia (la política de este asistente sigue
 * aplicando igual sobre lo que se le pide generar). */
export type ImageProvider = 'nano-banana' | 'openai' | 'comfyui';

export const IMAGE_PROVIDERS: ImageProvider[] = ['nano-banana', 'openai', 'comfyui'];

export type AiIntegrationsConfig = {
  /** Guion (pulido de texto) e imágenes/voz de OpenAI. */
  openaiApiKey: string | null;
  /** Voz premium de personajes. */
  elevenLabsApiKey: string | null;
  /** fal.ai — agregador real (pago por uso, no una suscripción envoltorio):
   * cubre generación de imagen (Nano Banana y otros) y de video (Seedance y
   * otros) con una sola key, en vez de una por modelo/proveedor. */
  falApiKey: string | null;
  /** Proveedor activo para retratos/fondos — ver ImageProvider arriba. */
  imageProvider: ImageProvider;
  /** Solo `imageProvider: "comfyui"` — dirección del servidor ComfyUI local
   * (arrancado aparte, corriendo en esta máquina) que atiende la generación. */
  comfyuiBaseUrl: string;
  /** Solo `imageProvider: "comfyui"` — nombre del archivo de checkpoint SDXL
   * a usar (tiene que existir en ComfyUI/models/checkpoints). */
  comfyuiCheckpoint: string;
};

export function createEmptyAiIntegrationsConfig(): AiIntegrationsConfig {
  return {
    openaiApiKey: null,
    elevenLabsApiKey: null,
    falApiKey: null,
    imageProvider: 'nano-banana',
    comfyuiBaseUrl: 'http://127.0.0.1:8188',
    comfyuiCheckpoint: 'RealVisXL_V5.0_fp16.safetensors',
  };
}

export function isAiIntegrationsConfig(value: unknown): value is AiIntegrationsConfig {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  const isKey = (x: unknown): boolean => x === null || typeof x === 'string';
  return (
    isKey(v['openaiApiKey']) &&
    isKey(v['elevenLabsApiKey']) &&
    isKey(v['falApiKey']) &&
    (v['imageProvider'] === 'nano-banana' || v['imageProvider'] === 'openai' || v['imageProvider'] === 'comfyui') &&
    typeof v['comfyuiBaseUrl'] === 'string' &&
    typeof v['comfyuiCheckpoint'] === 'string'
  );
}
