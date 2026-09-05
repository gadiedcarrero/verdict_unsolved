import type { Clue, Investigation } from '../game-engine/scene-engine/schemas';
import { cluesRequired } from '../game-engine/scene-engine/investigation';
import { translate } from '../i18n/translate';

/**
 * Lo que el jugador lleva reunido: las pistas de la investigación en curso y
 * la evidencia del caso que sigue valiendo después de cerrarla.
 *
 * Las pistas que faltan aparecen como huecos vacíos, sin decir qué son. Es
 * información que el jugador ya tiene (el contador dice 2/3), pero verla como
 * un espacio en blanco en la lista es lo que convierte "me falta una" en "me
 * falta ESTA", que es la pregunta que lo manda de vuelta a la escena.
 */
export function CluePanel({
  investigation,
  discoveredClueIds,
  globalEvidence,
  strings,
  onClose,
}: {
  investigation: Investigation;
  discoveredClueIds: string[];
  globalEvidence: Clue[];
  strings: Record<string, string>;
  onClose: () => void;
}) {
  const required = cluesRequired(investigation);
  const found = investigation.clues.filter((clue) => discoveredClueIds.includes(clue.id));
  const missing = Math.max(0, required - found.length);

  return (
    <div
      className="absolute inset-0 flex items-center justify-center bg-graphite-950/80 p-6"
      style={{ zIndex: 500 }}
    >
      <div className="flex w-full max-w-xl flex-col gap-5 rounded border border-graphite-700 bg-graphite-900 p-6">
        <div className="flex items-baseline justify-between">
          <p className="text-xs font-semibold tracking-widest text-graphite-300 uppercase">
            {translate(strings, 'clues.title')}
          </p>
          <p className="text-xs tracking-widest text-graphite-400 uppercase">
            {found.length} / {required}
          </p>
        </div>

        <ul className="flex flex-col gap-2">
          {found.map((clue) => (
            <li key={clue.id} className="flex gap-3 text-sm text-graphite-100">
              <span aria-hidden className="text-graphite-500">
                ▸
              </span>
              <span>{translate(strings, clue.text)}</span>
            </li>
          ))}
          {Array.from({ length: missing }, (_, index) => (
            <li
              key={`pendiente-${index}`}
              className="flex gap-3 text-sm text-graphite-600 italic"
              data-testid="clue-pending"
            >
              <span aria-hidden>▸</span>
              <span>{translate(strings, 'clues.pending')}</span>
            </li>
          ))}
        </ul>

        {globalEvidence.length > 0 && (
          <div className="flex flex-col gap-2 border-t border-graphite-800 pt-4">
            <p className="text-xs font-semibold tracking-widest text-graphite-300 uppercase">
              {translate(strings, 'clues.evidence')}
            </p>
            <ul className="flex flex-col gap-2">
              {globalEvidence.map((clue) => (
                <li key={clue.id} className="flex gap-3 text-sm text-graphite-200">
                  <span aria-hidden className="text-graphite-500">
                    ▸
                  </span>
                  <span>{translate(strings, clue.text)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="self-end text-xs tracking-widest text-graphite-400 uppercase hover:text-graphite-200"
        >
          {translate(strings, 'clues.close')}
        </button>
      </div>
    </div>
  );
}
