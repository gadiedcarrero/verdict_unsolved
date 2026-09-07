/**
 * Shared between the Electron main process and the renderer (via preload).
 *
 * Catálogo común de capacidades: lo que casi cualquier aventura necesita, para
 * no reescribirlo juego por juego.
 *
 * Es una SUGERENCIA, no la lista cerrada. Un juego de supervivencia va a
 * querer "nadar" o "pescar" y uno de espías "criptografía", y no hay forma de
 * anticiparlos desde acá — el editor deja agregar los que hagan falta y el
 * vocabulario real de un juego es este catálogo más lo suyo (ver
 * capabilityVocabulary en scene-engine/capabilities.ts).
 *
 * Que exista este piso común importa por algo más que comodidad: una
 * capacidad es una coincidencia exacta de texto entre lo que el personaje
 * tiene y lo que la zona pide. Reescribirla en cada juego es una oportunidad
 * de tipearla distinto, y "fuerza" contra "fuerte" no da ningún error: deja
 * una zona que no responde nunca.
 */

export type CommonCapability = { code: string; label: string };

export const COMMON_CAPABILITIES: CommonCapability[] = [
  { code: 'fuerza', label: 'Fuerza' },
  { code: 'agilidad', label: 'Agilidad' },
  { code: 'movilidad', label: 'Movilidad' },
  { code: 'sigilo', label: 'Sigilo' },
  { code: 'infiltracion', label: 'Infiltración' },
  { code: 'percepcion', label: 'Percepción' },
  { code: 'deduccion', label: 'Deducción' },
  { code: 'analisis', label: 'Análisis' },
  { code: 'hackeo', label: 'Hackeo' },
  { code: 'destreza', label: 'Destreza manual' },
  { code: 'persuasion', label: 'Persuasión' },
  { code: 'resistencia', label: 'Resistencia' },
];

/** Etiqueta legible de una capacidad. Las que un juego inventa no están en el
 * catálogo y se muestran tal cual las escribió el autor. */
export function capabilityLabel(code: string): string {
  return COMMON_CAPABILITIES.find((capability) => capability.code === code)?.label ?? code;
}
