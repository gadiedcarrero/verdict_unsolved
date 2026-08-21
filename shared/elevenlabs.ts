/**
 * Shared between the Electron main process and the renderer (via preload).
 * Kept dependency-free and framework-agnostic on purpose (mismo criterio que
 * script-breakdown.ts / ai-integrations.ts).
 */
export type ElevenLabsVoice = {
  voiceId: string;
  name: string;
  gender: string | null;
  accent: string | null;
  descriptive: string | null;
  /** Idioma base del voice (código corto, ej: "en") — respaldo para filtrar
   * por idioma en voces sin `verified_languages` propio. */
  language: string | null;
  /** Muestra de audio "principal" del voice (normalmente en inglés). */
  previewUrl: string | null;
  /** Idioma (código corto, ej: "es", "en") → muestra de audio en ESE idioma
   * — ElevenLabs genera una preview distinta por idioma verificado para
   * voces multilingües (ver `verified_languages` en la API real). También
   * se usa para filtrar el desplegable por idioma: si un idioma no está acá
   * (ni coincide con `language`), la voz no se ofrece para ese idioma. */
  previewUrlByLanguage: Record<string, string>;
};

export type ElevenLabsVoicesResult = { ok: true; voices: ElevenLabsVoice[] } | { ok: false; error: string };
