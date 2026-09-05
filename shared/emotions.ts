/**
 * Shared between main and renderer. Vocabulario fijo de expresiones
 * emocionales — a propósito chico y cerrado (no texto libre): así el
 * desplegable "Expresión del retrato" en el compositor de diálogo
 * (ActionComposer, SceneEditorPanel.tsx) siempre elige entre las mismas
 * opciones conocidas para cualquier personaje, en vez de inventar estados
 * nuevos cada vez. `Character.expressions` se llena con estas claves
 * exactas cuando se generan por IA (ver CharacterEditorPanel.tsx) — la
 * generación usa el retrato por defecto del personaje como referencia
 * visual (edición de imagen, no texto puro) para que la cara se mantenga
 * reconocible entre expresiones.
 */
export type EmotionCode = 'alegre' | 'serio' | 'molesto' | 'asustado' | 'asombrado' | 'triste';

export const EMOTIONS: { code: EmotionCode; label: string; promptHint: string }[] = [
  { code: 'alegre', label: 'Alegre', promptHint: 'happy, smiling warmly' },
  { code: 'serio', label: 'Serio', promptHint: 'serious, neutral, composed' },
  { code: 'molesto', label: 'Molesto', promptHint: 'angry, irritated, frowning' },
  { code: 'asustado', label: 'Asustado', promptHint: 'scared, afraid, wide-eyed' },
  { code: 'asombrado', label: 'Asombrado', promptHint: 'surprised, astonished, shocked' },
  { code: 'triste', label: 'Triste', promptHint: 'sad, sorrowful, downcast' },
];

/**
 * Vocabulario aparte —y más chico— para los sprites de cuerpo entero de una
 * variante (ver `CharacterVariant` en schemas.ts). Son menos que las
 * emociones del busto a propósito: el costo de generación de una variante es
 * variantes × expresiones, así que cada entrada que se agregue acá se paga
 * multiplicada por cada variante de cada personaje. En escena el personaje se
 * ve chico y de lejos — cuatro gestos legibles alcanzan; el matiz fino se lee
 * en el retrato del círculo de diálogo, que sí tiene las seis.
 *
 * Los hints describen el GESTO de cuerpo entero, no solo la cara, porque
 * acá se ve el cuerpo completo. La pose base (de pie, sentado, en silla de
 * ruedas) NO se toca: la fija la descripción de la variante y tiene que
 * mantenerse igual entre expresiones.
 */
export type BodyExpressionCode = 'conversando' | 'riendo' | 'serio' | 'tenso';

export const BODY_EXPRESSIONS: { code: BodyExpressionCode; label: string; promptHint: string }[] = [
  {
    code: 'conversando',
    label: 'Conversando',
    promptHint: 'talking, mid-sentence, one hand raised in a natural explaining gesture',
  },
  { code: 'riendo', label: 'Riendo', promptHint: 'laughing openly, relaxed shoulders, head slightly back' },
  { code: 'serio', label: 'Serio', promptHint: 'serious and composed, still, arms neutral at the sides' },
  { code: 'tenso', label: 'Tenso', promptHint: 'tense and alert, shoulders tight, guarded body language' },
];
