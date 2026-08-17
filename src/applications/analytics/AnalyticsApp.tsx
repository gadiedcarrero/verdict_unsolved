import type { JSX } from 'react';
import { AnalyticsIcon } from '../../desktop/icons';

export function AnalyticsApp(): JSX.Element {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-graphite-400">
      <AnalyticsIcon className="h-8 w-8 text-graphite-600" />
      <p className="text-sm font-medium text-graphite-300">Analytics — próximamente</p>
      <p className="max-w-sm text-xs leading-relaxed">
        Esta sección mostrará estadísticas de tu carrera como investigador (casos resueltos,
        precisión, tendencias de reputación) cuando exista progresión entre múltiples casos.
      </p>
    </div>
  );
}
