import type { TextStyle, TextStyleOverride } from '../game-engine/scene-engine/schemas';

/** Funde el default general del sitio con un override parcial — cada campo
 * del override presente pisa el default, el resto sigue viniendo de ahí.
 * Ojo: un `{...base, ...override}` se rompería acá — mientras se edita, un
 * campo puede quedar en el override con valor `undefined` explícito (recién
 * vaciado en el input), y ese spread lo pisaría igual en vez de ignorarlo. */
export function resolveTextStyle(base: TextStyle, override: TextStyleOverride | undefined): TextStyle {
  return {
    fontFamily: override?.fontFamily ?? base.fontFamily,
    fontSize: override?.fontSize ?? base.fontSize,
    color: override?.color ?? base.color,
  };
}
