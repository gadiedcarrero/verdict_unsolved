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
