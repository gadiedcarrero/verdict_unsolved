import type { JSX } from 'react';
import type { Item } from '../game-engine/scene-engine/schemas';
import { gameAssetUrl } from './gameAssetUrl';
import { translate } from '../i18n/translate';

/**
 * Lo que el jugador lleva encima, abajo a la derecha.
 *
 * No se hace click en un objeto para "usarlo": usar la tarjeta ES abrir la
 * puerta que la pide (ver `Condition.items`). Un modo "seleccionar objeto y
 * después el destino" agregaría un paso a cada interacción, y en un juego en
 * primera persona donde ya se hace click sobre lo que se quiere usar, ese
 * paso no decide nada — solo se puede olvidar. Por eso esto muestra, no opera.
 */
export function InventoryBar({
  items,
  strings,
  gameId,
}: {
  items: Item[];
  strings: Record<string, string>;
  gameId: string;
}): JSX.Element | null {
  if (items.length === 0) return null;

  return (
    <div className="pointer-events-none absolute right-0 bottom-0 p-3" style={{ zIndex: 340 }}>
      <div className="pointer-events-auto flex items-center gap-2 rounded bg-graphite-950/85 px-3 py-2">
        {items.map((item) => {
          const name = translate(strings, item.name);
          return (
            <div key={item.id} title={name} className="flex flex-col items-center gap-1">
              {item.icon ? (
                <img
                  src={gameAssetUrl(gameId, item.icon)}
                  alt={name}
                  className="h-9 w-9 rounded border border-graphite-700 object-cover"
                />
              ) : (
                // Sin icono generado todavía, el nombre alcanza para que el
                // objeto sirva — no hace falta arte para que el juego funcione.
                <span className="rounded border border-graphite-700 px-2 py-1 text-[10px] text-graphite-200">
                  {name}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
