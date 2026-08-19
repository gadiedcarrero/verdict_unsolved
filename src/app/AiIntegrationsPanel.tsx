import { useEffect, useState, type JSX } from 'react';
import { createEmptyAiIntegrationsConfig, type AiIntegrationsConfig } from '../../shared/ai-integrations';

const inputClassName =
  'w-full rounded border border-graphite-700 bg-graphite-900 px-1.5 py-1 text-[10px] text-graphite-100';

const FIELDS: { key: keyof AiIntegrationsConfig; label: string; hint: string }[] = [
  { key: 'openaiApiKey', label: 'OpenAI', hint: 'Guion, imágenes y voz de OpenAI' },
  { key: 'elevenLabsApiKey', label: 'ElevenLabs', hint: 'Voz premium de personajes' },
  { key: 'imageApiKey', label: 'Imagen (Nano Banana u otro)', hint: 'Si no usás la de OpenAI para generar imágenes' },
  { key: 'seedanceApiKey', label: 'Seedance', hint: 'Generación de video' },
];

/**
 * Keys de proveedores de IA para todo el pipeline de producción (ver
 * docs/plataforma/00-vision-ia.md) — global a la plataforma, no por juego,
 * por eso vive en el selector de proyectos y no en Ajustes de un juego
 * puntual. Se guarda en userData vía IPC (electron/main/ipc/
 * aiIntegrationsHandlers.ts), nunca dentro del repo.
 */
export function AiIntegrationsPanel({ onClose }: { onClose: () => void }): JSX.Element {
  const [config, setConfig] = useState<AiIntegrationsConfig>(createEmptyAiIntegrationsConfig());
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    void window.api.readAiIntegrations().then((data) => {
      setConfig(data);
      setLoaded(true);
    });
  }, []);

  async function handleSave(): Promise<void> {
    setSaving(true);
    setSaveMessage(null);
    try {
      await window.api.writeAiIntegrations(config);
      setSaveMessage('Guardado.');
    } catch (error) {
      setSaveMessage(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded border border-graphite-700 bg-graphite-950 p-5 text-xs text-graphite-200"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[11px] font-semibold tracking-widest text-graphite-100 uppercase">Integraciones IA</h2>
          <button type="button" onClick={onClose} className="text-graphite-500 hover:text-amber-accent">
            ✕
          </button>
        </div>
        <p className="mb-3 text-[10px] text-graphite-500">
          Vale para todos los proyectos de esta máquina — se guarda fuera del repositorio, nunca en un JSON que se
          commitea a git.
        </p>
        {!loaded ? (
          <p className="text-[10px] text-graphite-500">Cargando...</p>
        ) : (
          <>
            {FIELDS.map((field) => (
              <label key={field.key} className="mb-2 flex flex-col">
                <span className="text-[9px] text-graphite-500 uppercase">{field.label}</span>
                <input
                  type="password"
                  autoComplete="off"
                  value={config[field.key] ?? ''}
                  onChange={(event) => setConfig((prev) => ({ ...prev, [field.key]: event.target.value || null }))}
                  placeholder={field.hint}
                  className={inputClassName}
                />
              </label>
            ))}
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="mt-2 w-full rounded border border-amber-accent px-2 py-1 text-[10px] font-semibold tracking-widest text-amber-accent uppercase transition-colors hover:bg-amber-accent hover:text-graphite-950 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
            {saveMessage && <p className="mt-2 text-[10px] text-graphite-400">{saveMessage}</p>}
          </>
        )}
      </div>
    </div>
  );
}
