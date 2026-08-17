import type { JSX } from 'react';
import { usePreferencesStore } from '../../game-engine/preferences/preferences.store';

export function SettingsApp(): JSX.Element {
  const textScale = usePreferencesStore((s) => s.textScale);
  const setTextScale = usePreferencesStore((s) => s.setTextScale);
  const reduceMotion = usePreferencesStore((s) => s.reduceMotion);
  const toggleReduceMotion = usePreferencesStore((s) => s.toggleReduceMotion);

  return (
    <div className="h-full overflow-y-auto p-6 text-graphite-100">
      <h2 className="mb-6 text-sm font-semibold tracking-wide text-graphite-400 uppercase">
        Accesibilidad
      </h2>

      <div className="max-w-md space-y-6">
        <div className="flex items-center justify-between rounded border border-graphite-700 bg-graphite-850 p-4">
          <div>
            <p className="text-sm font-medium text-graphite-100">Tamaño de texto</p>
            <p className="mt-0.5 text-xs text-graphite-400">
              Aumenta el tamaño del texto en toda la aplicación.
            </p>
          </div>
          <div className="flex overflow-hidden rounded border border-graphite-600">
            <button
              type="button"
              onClick={() => setTextScale('normal')}
              className={`px-3 py-1.5 text-xs ${
                textScale === 'normal'
                  ? 'bg-amber-accent text-graphite-950'
                  : 'text-graphite-300 hover:bg-graphite-800'
              }`}
            >
              Normal
            </button>
            <button
              type="button"
              onClick={() => setTextScale('large')}
              className={`px-3 py-1.5 text-xs ${
                textScale === 'large'
                  ? 'bg-amber-accent text-graphite-950'
                  : 'text-graphite-300 hover:bg-graphite-800'
              }`}
            >
              Grande
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between rounded border border-graphite-700 bg-graphite-850 p-4">
          <div>
            <p className="text-sm font-medium text-graphite-100">Reducir animaciones</p>
            <p className="mt-0.5 text-xs text-graphite-400">
              Minimiza transiciones y efectos de movimiento en la interfaz.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={reduceMotion}
            onClick={toggleReduceMotion}
            className={`h-6 w-11 shrink-0 rounded-full transition-colors ${
              reduceMotion ? 'bg-amber-accent' : 'bg-graphite-700'
            }`}
          >
            <span
              className={`block h-5 w-5 translate-y-0.5 rounded-full bg-graphite-100 transition-transform ${
                reduceMotion ? 'translate-x-5.5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
