import type { JSX } from 'react';
import { ReportsIcon } from '../../desktop/icons';

export function ReportsApp(): JSX.Element {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-graphite-400">
      <ReportsIcon className="h-8 w-8 text-graphite-600" />
      <p className="text-sm font-medium text-graphite-300">Reports — próximamente</p>
      <p className="max-w-sm text-xs leading-relaxed">
        Aquí construirás el informe final: responder las preguntas del caso y adjuntar la evidencia
        que respalda tu conclusión. Todavía no está implementado en este prototipo.
      </p>
    </div>
  );
}
