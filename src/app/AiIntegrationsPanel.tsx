import { useEffect, useState, type JSX } from 'react';
import {
  createEmptyAiIntegrationsConfig,
  IMAGE_PROVIDERS,
  type AiIntegrationsConfig,
  type ImageProvider,
} from '../../shared/ai-integrations';
import { ComfyUIStatusIndicator } from '../components/ComfyUIStatusIndicator';

const inputClassName =
  'w-full rounded border border-graphite-700 bg-graphite-900 px-1.5 py-1 text-[10px] text-graphite-100';

const FIELDS: { key: keyof AiIntegrationsConfig; label: string; hint: string }[] = [
  { key: 'openaiApiKey', label: 'OpenAI', hint: 'Guion, imágenes y voz de OpenAI' },
  { key: 'elevenLabsApiKey', label: 'ElevenLabs', hint: 'Voz premium de personajes' },
  { key: 'falApiKey', label: 'fal.ai', hint: 'Imagen (Nano Banana y otros) y video (Seedance y otros) — fal.ai/dashboard/keys' },
];

const IMAGE_PROVIDER_LABEL: Record<ImageProvider, string> = {
  'nano-banana': 'Nano Banana (fal.ai)',
  openai: 'OpenAI (gpt-image-1)',
  comfyui: 'Local (ComfyUI, sin key)',
};

const IMAGE_PROVIDER_HINT: Record<ImageProvider, string> = {
  'nano-banana': 'Buena consistencia multi-personaje en una sola escena. Necesita la key de fal.ai arriba.',
  openai: 'Necesita la key de OpenAI arriba. Con varios personajes en un fondo, solo el primero ancla identidad.',
  comfyui:
    'Corre en tu máquina (SDXL + InstantID) — sin key, sin límite de contenido propio del proveedor, pero necesita ComfyUI abierto acá mismo y consistencia multi-personaje más débil que Nano Banana.',
};

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
  // null = todavía no se intentó listar / falló (ComfyUI no está instalado
  // en esta máquina, o la carpeta de checkpoints no existe) — en ese caso
  // el campo cae a texto libre en vez de mostrar un selector vacío.
  const [checkpointFiles, setCheckpointFiles] = useState<string[] | null>(null);

  useEffect(() => {
    void window.api.readAiIntegrations().then((data) => {
      setConfig(data);
      setLoaded(true);
    });
    void window.api.listComfyUICheckpoints().then((result) => {
      if (result.ok) setCheckpointFiles(result.files);
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

            <label className="mb-1 flex flex-col">
              <span className="text-[9px] text-graphite-500 uppercase">Generación de imagen — retratos y fondos</span>
              <select
                value={config.imageProvider}
                onChange={(event) =>
                  setConfig((prev) => ({ ...prev, imageProvider: event.target.value as ImageProvider }))
                }
                className={inputClassName}
              >
                {IMAGE_PROVIDERS.map((provider) => (
                  <option key={provider} value={provider}>
                    {IMAGE_PROVIDER_LABEL[provider]}
                  </option>
                ))}
              </select>
            </label>
            <p className="mb-2 text-[9px] text-graphite-500">{IMAGE_PROVIDER_HINT[config.imageProvider]}</p>

            {config.imageProvider === 'comfyui' && (
              <div className="mb-2 rounded border border-graphite-800 bg-graphite-900/40 p-2">
                <label className="mb-2 flex flex-col">
                  <span className="text-[9px] text-graphite-500 uppercase">Servidor ComfyUI</span>
                  <input
                    type="text"
                    value={config.comfyuiBaseUrl}
                    onChange={(event) => setConfig((prev) => ({ ...prev, comfyuiBaseUrl: event.target.value }))}
                    placeholder="http://127.0.0.1:8188"
                    className={inputClassName}
                  />
                </label>
                <label className="flex flex-col">
                  <span className="text-[9px] text-graphite-500 uppercase">Checkpoint SDXL</span>
                  {checkpointFiles && checkpointFiles.length > 0 ? (
                    <select
                      value={config.comfyuiCheckpoint}
                      onChange={(event) => setConfig((prev) => ({ ...prev, comfyuiCheckpoint: event.target.value }))}
                      className={inputClassName}
                    >
                      {/* Si el valor guardado ya no está en la carpeta (se borró, o se
                       * escribió a mano antes de que existiera este selector), lo
                       * dejamos como opción igual — cambiar de proveedor y volver no
                       * debería perder silenciosamente lo que había guardado. */}
                      {!checkpointFiles.includes(config.comfyuiCheckpoint) && (
                        <option value={config.comfyuiCheckpoint}>{config.comfyuiCheckpoint} (no encontrado)</option>
                      )}
                      {checkpointFiles.map((file) => (
                        <option key={file} value={file}>
                          {file}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={config.comfyuiCheckpoint}
                      onChange={(event) => setConfig((prev) => ({ ...prev, comfyuiCheckpoint: event.target.value }))}
                      placeholder="realcartoonXL_v6.safetensors"
                      className={inputClassName}
                    />
                  )}
                </label>
                <p className="mb-2 text-[8px] text-graphite-600">
                  Tiene que estar corriendo en esta máquina antes de generar.
                </p>
                <ComfyUIStatusIndicator
                  override={{ imageProvider: config.imageProvider, baseUrl: config.comfyuiBaseUrl }}
                />
              </div>
            )}

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
