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

// Los hints describen la CARA, no la emoción. "angry, irritated" y "scared,
// afraid" son etiquetas abstractas y un generador de imagen las resuelve casi
// igual: ceño fruncido y poco más — por eso serio, molesto y asustado salían
// prácticamente idénticos. Nombrar los músculos (cejas, párpados, boca,
// mandíbula) es lo que las separa, porque es lo que de verdad cambia entre
// una cara y otra.
//
// Cada hint dice además qué hace la BOCA, que es el rasgo que más distingue
// una expresión de otra a tamaño de retrato y el que estas etiquetas cortas
// dejaban sin especificar.
export const EMOTIONS: { code: EmotionCode; label: string; promptHint: string }[] = [
  {
    code: 'alegre',
    label: 'Alegre',
    promptHint:
      'openly happy: a wide warm smile with the mouth clearly open showing teeth, cheeks lifted and bunched, crow\'s feet creasing at the outer corners of narrowed sparkling eyes, eyebrows relaxed and slightly raised',
  },
  {
    code: 'serio',
    label: 'Serio',
    promptHint:
      'completely neutral and composed: level relaxed eyebrows with no furrow at all between them, smooth unlined forehead, eyes calmly open at a normal width, lips gently closed in a straight line, jaw loose and untensed',
  },
  {
    code: 'molesto',
    label: 'Molesto',
    promptHint:
      'visibly angry: eyebrows driven sharply down and pulled together into a deep vertical crease between them, upper eyelids tense and lower lids raised into a hard glare, nostrils flared, lips pressed into a tight thin line with a clenched jaw and a visible muscle at the cheekbone',
  },
  {
    code: 'asustado',
    label: 'Asustado',
    promptHint:
      'frightened: eyebrows raised high and dragged together, horizontal creases across the forehead, eyes stretched wide with white clearly visible above the iris, mouth hanging open in a tense oval, chin drawn back and head shrinking away',
  },
  {
    code: 'asombrado',
    label: 'Asombrado',
    promptHint:
      'astonished: eyebrows lifted high in smooth arches, forehead creased horizontally, eyes round and wide open, mouth dropped open in a slack circle, whole face lifted and slack with surprise rather than tense',
  },
  {
    code: 'triste',
    label: 'Triste',
    promptHint:
      'sorrowful: inner ends of the eyebrows pulled up and together while the outer ends droop, upper eyelids heavy and half lowered, gaze cast downward, corners of the closed mouth turned distinctly down, chin faintly puckered',
  },
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
