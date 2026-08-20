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
  /** Muestra de audio "principal" del voice (normalmente en inglés). */
  previewUrl: string | null;
  /** Idioma (código corto, ej: "es", "en") → muestra de audio en ESE idioma
   * — ElevenLabs genera una preview distinta por idioma verificado para
   * voces multilingües (ver `verified_languages` en la API real). Vacío si
   * el voice no tiene verificación multi-idioma; en ese caso usar
   * `previewUrl` igual, el modelo multilingüe puede hablar otros idiomas
   * aunque no haya muestra específica. */
  previewUrlByLanguage: Record<string, string>;
};

export type ElevenLabsVoicesResult = { ok: true; voices: ElevenLabsVoice[] } | { ok: false; error: string };
