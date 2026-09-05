import type { Item, Scene } from './schemas';

/**
 * Los objetos se definen en la escena donde se consiguen (ver `Scene.items`),
 * pero se llevan a todas: resolverlos es recorrer las escenas, igual que la
 * evidencia global.
 *
 * Lo que se guarda en la partida es el id, nunca el objeto entero — el nombre
 * y el icono son contenido de la escena, y copiarlos al save los congelaría:
 * renombrar "Tarjeta" a "Tarjeta de mantenimiento" no llegaría a una partida
 * ya empezada.
 */

export function itemById(scenes: readonly Scene[], itemId: string): Item | null {
  for (const scene of scenes) {
    const found = scene.items.find((item) => item.id === itemId);
    if (found) return found;
  }
  return null;
}

/** Lo que el jugador lleva encima, en el orden en que lo consiguió. Un id sin
 * definición (la escena que lo daba se borró) se saltea en vez de romper el
 * inventario: perder un icono es mejor que perder la pantalla. */
export function inventoryItems(scenes: readonly Scene[], inventoryItemIds: readonly string[]): Item[] {
  const items: Item[] = [];
  for (const id of inventoryItemIds) {
    const item = itemById(scenes, id);
    if (item) items.push(item);
  }
  return items;
}
