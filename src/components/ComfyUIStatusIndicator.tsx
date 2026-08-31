import { useEffect, useState, type JSX } from 'react';

const POLL_INTERVAL_MS = 8000;

/**
 * Semáforo de si el servidor ComfyUI local está prendido y listo, con
 * botón para arrancarlo si no lo está — solo se muestra cuando el
 * proveedor de imagen activo es "comfyui" (para Nano Banana/OpenAI no hay
 * nada que prender).
 *
 * Sin props: autocontenido, lee la config de integraciones IA YA GUARDADA
 * y pollea el estado por su cuenta — pensado para colgarlo en cualquier
 * pantalla (editor de juego) sin que quien lo usa tenga que cargar esa
 * config primero. Con `override`: usa esos valores en vez de leerlos del
 * disco — lo necesita AiIntegrationsPanel, donde el usuario puede estar
 * editando el proveedor/URL sin haber guardado todavía; sin esto, el
 * semáforo mostraría el estado del proveedor VIEJO mientras se edita uno
 * nuevo.
 */
export function ComfyUIStatusIndicator({
  override,
}: {
  override?: { imageProvider: string; baseUrl: string };
}): JSX.Element | null {
  const [loadedImageProvider, setLoadedImageProvider] = useState<string | null>(null);
  const [loadedBaseUrl, setLoadedBaseUrl] = useState('');
  const [running, setRunning] = useState<boolean | null>(null);
  const [launching, setLaunching] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);
  const imageProvider = override?.imageProvider ?? loadedImageProvider;
  const baseUrl = override?.baseUrl ?? loadedBaseUrl;

  useEffect(() => {
    if (override) return;
    let cancelled = false;
    void window.api.readAiIntegrations().then((config) => {
      if (cancelled) return;
      setLoadedImageProvider(config.imageProvider);
      setLoadedBaseUrl(config.comfyuiBaseUrl);
    });
    return () => {
      cancelled = true;
    };
  }, [override]);

  useEffect(() => {
    if (imageProvider !== 'comfyui' || !baseUrl) return;
    let cancelled = false;
    async function check(): Promise<void> {
      const result = await window.api.checkComfyUIStatus(baseUrl);
      if (!cancelled) setRunning(result.running);
    }
    void check();
    const interval = window.setInterval(() => void check(), POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [imageProvider, baseUrl]);

  async function handleLaunch(): Promise<void> {
    setLaunching(true);
    setLaunchError(null);
    try {
      const result = await window.api.launchComfyUI();
      if (!result.ok) {
        setLaunchError(result.error);
        return;
      }
      // El servidor tarda en cargar el modelo antes de responder — sin
      // este margen el semáforo seguiría en rojo un rato después de haber
      // arrancado bien, como si el botón no hubiese hecho nada.
      window.setTimeout(() => {
        void window.api.checkComfyUIStatus(baseUrl).then((r) => setRunning(r.running));
      }, 4000);
    } finally {
      setLaunching(false);
    }
  }

  if (imageProvider !== 'comfyui') return null;

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-1.5 rounded border border-graphite-700 px-2 py-1">
        <span
          className={`h-2 w-2 shrink-0 rounded-full ${
            running ? 'bg-emerald-400' : running === null ? 'bg-graphite-600' : 'bg-red-500'
          }`}
        />
        <span className="text-[9px] tracking-widest text-graphite-400 uppercase">
          {running ? 'ComfyUI listo' : running === null ? 'ComfyUI...' : 'ComfyUI apagado'}
        </span>
        {running === false && (
          <button
            type="button"
            onClick={() => void handleLaunch()}
            disabled={launching}
            className="ml-1 rounded border border-amber-accent px-1.5 py-0.5 text-[9px] tracking-widest text-amber-accent uppercase transition-colors hover:bg-amber-accent hover:text-graphite-950 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {launching ? 'Arrancando...' : 'Arrancar'}
          </button>
        )}
      </div>
      {launchError && <p className="text-[9px] text-red-300">{launchError}</p>}
    </div>
  );
}
