import type { ScriptBreakdownCharacter } from '@shared/script-breakdown';

/**
 * De los nombres que el desglose pone en un panel ("Adrian", "Evelyn") a los
 * ids del roster, para poder mandar sus retratos como referencia visual al
 * generar el fondo.
 *
 * Hace falta emparejar y no comparar directo por dos motivos: el guion nombra
 * a la gente por su nombre de pila mientras el roster los registra completos
 * ("Evelyn" → "Evelyn Marlowe"), y los personajes que el jugador conoce como
 * otra persona viven en `alternateLooks`, no en la lista principal — "Adrian"
 * no existe como personaje de primer nivel, es una identidad de "gray".
 */

function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

type Candidate = { id: string; label: string };

function candidatesOf(characters: readonly ScriptBreakdownCharacter[]): Candidate[] {
  const candidates: Candidate[] = [];
  for (const character of characters) {
    candidates.push({ id: character.id, label: character.name });
    // Una identidad alternativa se promueve como personaje propio con su
    // `key` como id (ver promoteBreakdownCharacters), así que el retrato al
    // que hay que apuntar es el suyo, no el del personaje base.
    for (const look of character.alternateLooks) {
      candidates.push({ id: look.key, label: look.label });
    }
  }
  return candidates;
}

export function resolvePanelCharacterIds(
  names: readonly string[],
  characters: readonly ScriptBreakdownCharacter[],
): string[] {
  const candidates = candidatesOf(characters);
  const ids: string[] = [];

  for (const rawName of names) {
    const name = normalize(rawName);
    if (!name) continue;

    const exact = candidates.filter((c) => normalize(c.label) === name || normalize(c.id) === name);
    // Un nombre suelto ("Evelyn") contra el completo del roster ("Evelyn
    // Marlowe"). Se compara por palabras y no con `includes` a secas: así
    // "Ana" no matchea "Susana", que con substring sí pasaba.
    const loose =
      exact.length > 0
        ? exact
        : candidates.filter((c) => {
            const words = normalize(c.label).split(/\s+/);
            return words.includes(name);
          });

    // Ambiguo = no se manda referencia. Con "Hart" en el guion y Lena Hart y
    // Daniel Hart en el roster, elegir el primero pondría la cara equivocada
    // en la escena, que es peor que no poner ninguna.
    const unique = new Set(loose.map((c) => c.id));
    if (unique.size !== 1) continue;

    const id = loose[0]!.id;
    if (!ids.includes(id)) ids.push(id);
  }

  return ids;
}
