import type { Character } from '../game-engine/scene-engine/schemas';
import { gameAssetUrl } from './gameAssetUrl';
import { translate } from '../i18n/translate';

/**
 * Con quién se está jugando: retrato, nombre y capacidades, abajo a la
 * izquierda. Con más de un personaje disponible, es además el selector.
 *
 * El personaje jugado nunca se ve dentro de la imagen —la aventura es en
 * primera persona—, así que este recuadro es lo único que se lo recuerda al
 * jugador. Y como el personaje activo decide qué zonas responden, tener las
 * capacidades a la vista es lo que convierte "no puedo mover esto desde la
 * silla" en "esto lo tiene que hacer el otro" en vez de en un callejón.
 */
export function CharacterHud({
  active,
  available,
  strings,
  gameId,
  onSelect,
}: {
  active: Character;
  available: Character[];
  strings: Record<string, string>;
  gameId: string;
  onSelect: (characterId: string) => void;
}) {
  const others = available.filter((character) => character.id !== active.id);

  return (
    <div className="pointer-events-none absolute bottom-0 left-0 p-3" style={{ zIndex: 340 }}>
      <div className="pointer-events-auto flex items-end gap-2">
        <div className="flex items-center gap-3 rounded bg-graphite-950/85 px-3 py-2">
          <Portrait character={active} gameId={gameId} size={44} />
          <div className="flex flex-col gap-0.5">
            <p className="text-sm font-semibold" style={{ color: active.color }}>
              {translate(strings, active.name)}
            </p>
            {active.capabilities.length > 0 && (
              <p className="max-w-[16rem] text-[0.6rem] tracking-widest text-graphite-400 uppercase">
                {active.capabilities
                  .map((capability) => translate(strings, `capability.${capability}`))
                  .join(' · ')}
              </p>
            )}
          </div>
        </div>

        {/* Solo aparece con alguien más a quien cambiar: con un personaje
            único, un selector de uno sería una promesa vacía. */}
        {others.map((character) => (
          <button
            key={character.id}
            type="button"
            // El botón es solo un retrato: sin esto su nombre accesible sale
            // de lo que haya adentro (la inicial del fallback), que no le
            // dice a nadie a quién se está cambiando.
            aria-label={translate(strings, character.name)}
            title={translate(strings, character.name)}
            onClick={() => onSelect(character.id)}
            className="rounded bg-graphite-950/70 p-1.5 opacity-70 transition hover:opacity-100"
          >
            <Portrait character={character} gameId={gameId} size={34} />
          </button>
        ))}
      </div>
    </div>
  );
}

function Portrait({
  character,
  gameId,
  size,
}: {
  character: Character;
  gameId: string;
  size: number;
}) {
  if (!character.portrait) {
    // Sin retrato generado todavía: la inicial alcanza para distinguirlos y
    // no rompe el HUD mientras se está armando el juego.
    return (
      <div
        aria-hidden
        className="flex items-center justify-center rounded-full bg-graphite-800 text-xs font-semibold text-graphite-300"
        style={{ width: size, height: size, borderColor: character.color }}
      >
        {character.id.slice(0, 1).toUpperCase()}
      </div>
    );
  }
  return (
    <img
      src={gameAssetUrl(gameId, character.portrait)}
      alt=""
      className="rounded-full object-cover"
      style={{ width: size, height: size, border: `1px solid ${character.color}` }}
    />
  );
}
