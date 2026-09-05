import type { Character, Scene } from './schemas';

/**
 * Qué capacidades existen en un juego y cuáles nadie tiene.
 *
 * Una capacidad es un string libre, y ahí está el riesgo: una zona que pide
 * "fuerza" cuando el personaje tiene "fuerte" no da ningún error — la zona
 * simplemente no responde nunca, y el juego parece roto sin decir por qué.
 * Es el peor tipo de falla, porque se descubre jugando y no editando. Estas
 * funciones existen para convertirla en algo que el editor pueda mostrar.
 */

function conditionCapabilities(scene: Scene): string[] {
  const found: string[] = [];
  for (const background of scene.backgrounds) {
    for (const hotspot of background.hotspots) {
      found.push(...(hotspot.visibleWhen?.capabilities ?? []), ...(hotspot.enabledWhen?.capabilities ?? []));
    }
  }
  return found;
}

/** Todas las capacidades que el juego menciona, las tenga alguien o no:
 * las que los personajes declaran más las que las zonas piden. Es el
 * vocabulario que el editor ofrece para elegir, en vez de dejar escribir
 * cualquier cosa y que un tipeo rompa una zona en silencio. */
export function capabilityVocabulary(characters: readonly Character[], scenes: readonly Scene[]): string[] {
  const all = new Set<string>();
  for (const character of characters) {
    for (const capability of character.capabilities) all.add(capability);
  }
  for (const scene of scenes) {
    for (const capability of conditionCapabilities(scene)) all.add(capability);
  }
  return [...all].sort((a, b) => a.localeCompare(b));
}

/** Capacidades que alguna zona exige y ningún personaje del roster tiene.
 * Cada una es una zona que no va a responder nunca. */
export function unreachableCapabilities(characters: readonly Character[], scenes: readonly Scene[]): string[] {
  const owned = new Set<string>();
  for (const character of characters) {
    for (const capability of character.capabilities) owned.add(capability);
  }

  const missing = new Set<string>();
  for (const scene of scenes) {
    for (const capability of conditionCapabilities(scene)) {
      if (!owned.has(capability)) missing.add(capability);
    }
  }
  return [...missing].sort((a, b) => a.localeCompare(b));
}
