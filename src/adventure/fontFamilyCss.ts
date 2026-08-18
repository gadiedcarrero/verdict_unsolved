import type { FontFamily } from '../game-engine/scene-engine/schemas';

/**
 * Valor real de `font-family` para cada opción — se aplica como estilo
 * inline en vez de clases `font-sans`/`font-serif`/`font-mono` de Tailwind
 * porque "Comic Sans" no tiene utilidad propia (no es parte de la escala
 * tipográfica del tema), así que todas las tipografías se resuelven igual
 * acá para no tener dos mecanismos distintos.
 */
export const FONT_FAMILY_CSS: Record<FontFamily, string> = {
  sans: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
  serif: 'ui-serif, Georgia, "Times New Roman", serif',
  mono: 'ui-monospace, "SFMono-Regular", Menlo, monospace',
  'comic-sans': '"Comic Sans MS", "Comic Sans", "Chalkboard SE", cursive',
};
