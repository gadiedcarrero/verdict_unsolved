import { ipcMain } from 'electron';
import type { ElevenLabsVoice } from '../../../shared/elevenlabs';
import { formatApiError } from './apiErrors';
import { getStoredAiIntegrationsConfig } from './aiIntegrationsHandlers';

type RawVerifiedLanguage = { language?: unknown; preview_url?: unknown };
type RawVoice = {
  voice_id?: unknown;
  name?: unknown;
  labels?: { gender?: unknown; accent?: unknown; descriptive?: unknown; language?: unknown };
  preview_url?: unknown;
  verified_languages?: unknown;
};

function mapVoice(raw: RawVoice): ElevenLabsVoice | null {
  if (typeof raw.voice_id !== 'string' || typeof raw.name !== 'string') return null;
  const language = typeof raw.labels?.language === 'string' ? raw.labels.language : null;
  const previewUrlByLanguage: Record<string, string> = {};
  if (Array.isArray(raw.verified_languages)) {
    for (const entry of raw.verified_languages as RawVerifiedLanguage[]) {
      if (typeof entry.language === 'string' && typeof entry.preview_url === 'string') {
        previewUrlByLanguage[entry.language] = entry.preview_url;
      }
    }
  }
  // Respaldo: si ElevenLabs no mandó verified_languages para el idioma base
  // del voice (pasa con algunas voces "premade"), lo agregamos igual usando
  // la muestra general — si no, esa voz desaparecería del filtro por idioma
  // en su propio idioma base.
  if (language && !previewUrlByLanguage[language] && typeof raw.preview_url === 'string') {
    previewUrlByLanguage[language] = raw.preview_url;
  }
  return {
    voiceId: raw.voice_id,
    name: raw.name,
    gender: typeof raw.labels?.gender === 'string' ? raw.labels.gender : null,
    accent: typeof raw.labels?.accent === 'string' ? raw.labels.accent : null,
    descriptive: typeof raw.labels?.descriptive === 'string' ? raw.labels.descriptive : null,
    language,
    previewUrl: typeof raw.preview_url === 'string' ? raw.preview_url : null,
    previewUrlByLanguage,
  };
}

export function registerElevenLabsHandlers(): void {
  ipcMain.handle('ai:list-elevenlabs-voices', async () => {
    const config = await getStoredAiIntegrationsConfig();
    if (!config.elevenLabsApiKey) {
      return { ok: false, error: 'Falta la API key de ElevenLabs en Ajustes → Integraciones IA.' };
    }
    try {
      const response = await fetch('https://api.elevenlabs.io/v1/voices', {
        headers: { 'xi-api-key': config.elevenLabsApiKey },
      });
      if (!response.ok) {
        return { ok: false, error: await formatApiError('ElevenLabs', response) };
      }
      const data = (await response.json()) as { voices?: RawVoice[] };
      const voices = (data.voices ?? []).map(mapVoice).filter((v): v is ElevenLabsVoice => v !== null);
      return { ok: true, voices };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  });
}
