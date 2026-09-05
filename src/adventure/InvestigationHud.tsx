import type { Investigation } from '../game-engine/scene-engine/schemas';
import { cluesRequired, discoveredCluesOf } from '../game-engine/scene-engine/investigation';
import { translate } from '../i18n/translate';

/**
 * Objetivo, contador de pistas y SOLUCIONAR, siempre visibles arriba.
 *
 * La regla de UX del diseño es que el jugador nunca debe dudar de QUÉ tiene
 * que conseguir — solo de CÓMO. Por eso el objetivo va fijo en pantalla y no
 * escondido en un menú: si hay que abrir algo para recordarlo, ya falló.
 */
export function InvestigationHud({
  investigation,
  discoveredClueIds,
  strings,
  solved,
  canSolve,
  onSolve,
}: {
  investigation: Investigation;
  discoveredClueIds: string[];
  strings: Record<string, string>;
  solved: boolean;
  canSolve: boolean;
  onSolve: () => void;
}) {
  const objective = translate(strings, investigation.objective);
  const required = cluesRequired(investigation);
  const found = discoveredCluesOf(investigation, discoveredClueIds).length;

  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-0 flex justify-center p-3"
      style={{ zIndex: 350 }}
    >
      <div className="pointer-events-auto flex max-w-[90%] flex-col items-center gap-2 rounded bg-graphite-950/85 px-5 py-3 text-center">
        <p className="text-[0.65rem] font-semibold tracking-widest text-graphite-400 uppercase">
          {translate(strings, 'investigation.objective')}
        </p>
        <p className="text-sm font-semibold text-graphite-50">{objective}</p>

        {required > 0 && (
          <p className="text-xs tracking-widest text-graphite-300 uppercase">
            {translate(strings, 'investigation.clues')} {found} / {required}
          </p>
        )}

        {!solved && (
          <button
            type="button"
            disabled={!canSolve}
            onClick={onSolve}
            className="rounded border border-graphite-600 px-4 py-1 text-xs font-semibold tracking-widest text-graphite-100 uppercase enabled:hover:border-graphite-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {/* El candado se muestra igual cuando no se puede: que el botón
                exista y esté bloqueado le dice al jugador que hay algo que
                todavía le falta encontrar. Ocultarlo no le diría nada. */}
            {canSolve
              ? translate(strings, 'investigation.solve')
              : `${translate(strings, 'investigation.solve')} 🔒`}
          </button>
        )}
      </div>
    </div>
  );
}
