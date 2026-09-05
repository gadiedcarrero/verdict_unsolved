import { useState, type JSX } from 'react';
import type { Character } from '../../game-engine/scene-engine/schemas';

/**
 * Qué puede hacer este personaje. Decide qué zonas le responden (ver
 * `Condition.capabilities`), así que es la diferencia entre "Gray no puede
 * mover la caja" y "la caja no funciona".
 *
 * Se elige del vocabulario que ya usa el juego en vez de escribir libre: la
 * capacidad es un string, y "fuerza" contra "fuerte" no da ningún error, solo
 * una zona que no responde nunca. Se puede agregar una nueva, pero el camino
 * corto es marcar una existente.
 */
export function CapabilityFields({
  character,
  vocabulary,
  unreachable,
  onChange,
}: {
  character: Character;
  /** Todas las capacidades que el juego menciona hoy — de los personajes y de
   * lo que piden las zonas. */
  vocabulary: string[];
  /** Las que alguna zona exige y ningún personaje tiene: cada una es una zona
   * que no va a responder nunca. */
  unreachable: string[];
  onChange: (capabilities: string[]) => void;
}): JSX.Element {
  const [nueva, setNueva] = useState('');

  function toggle(capability: string): void {
    onChange(
      character.capabilities.includes(capability)
        ? character.capabilities.filter((c) => c !== capability)
        : [...character.capabilities, capability],
    );
  }

  function addNew(): void {
    const capability = nueva.trim().toLowerCase();
    if (!capability || character.capabilities.includes(capability)) return;
    onChange([...character.capabilities, capability]);
    setNueva('');
  }

  return (
    <div className="mt-2 border-t border-graphite-800 pt-1">
      <p className="mb-1 text-[9px] text-graphite-500 uppercase">Capacidades</p>

      {vocabulary.length === 0 && (
        <p className="mb-1 text-[9px] text-graphite-600">
          Todavía no hay ninguna. Agregá la primera abajo (fuerza, hackeo, infiltración…).
        </p>
      )}

      <div className="mb-1 flex flex-wrap gap-1">
        {vocabulary.map((capability) => {
          const has = character.capabilities.includes(capability);
          // Solo se marca en rojo la que nadie tiene, y solo mientras este
          // personaje no la tenga: en cuanto se le da, deja de ser un problema.
          const nadieLaTiene = !has && unreachable.includes(capability);
          return (
            <button
              key={capability}
              type="button"
              onClick={() => toggle(capability)}
              title={nadieLaTiene ? 'Alguna zona la pide y ningún personaje la tiene.' : undefined}
              className={`rounded border px-1.5 py-0.5 text-[9px] transition-colors ${
                has
                  ? 'border-amber-accent text-amber-accent'
                  : nadieLaTiene
                    ? 'border-red-500/60 text-red-400 hover:border-red-400'
                    : 'border-graphite-700 text-graphite-500 hover:border-graphite-500'
              }`}
            >
              {capability}
              {nadieLaTiene && ' ⚠'}
            </button>
          );
        })}
      </div>

      <div className="flex gap-1">
        <input
          value={nueva}
          onChange={(event) => setNueva(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') addNew();
          }}
          placeholder="nueva capacidad"
          className="min-w-0 flex-1 rounded border border-graphite-800 bg-graphite-950 px-1.5 py-0.5 text-[9px] text-graphite-200 outline-none focus:border-amber-accent"
        />
        <button
          type="button"
          onClick={addNew}
          disabled={!nueva.trim()}
          className="rounded border border-graphite-700 px-1.5 py-0.5 text-[9px] text-graphite-400 transition-colors hover:border-amber-accent hover:text-amber-accent disabled:opacity-40"
        >
          +
        </button>
      </div>
    </div>
  );
}
