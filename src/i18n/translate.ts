/**
 * Traducción mínima basada en diccionario: cada caso trae un
 * locales/es.json (clave → texto). El juego solo tiene español por ahora,
 * pero cualquier texto que el jugador vea (como el nombre de un hotspot al
 * pasar el mouse) se guarda como clave, nunca como texto fijo, para poder
 * sumar otros idiomas después sin tocar el contenido de las escenas.
 *
 * Si la clave no está en el diccionario, se devuelve la clave misma — así
 * un texto sin traducir se nota en pantalla en vez de desaparecer en
 * silencio.
 */
export function translate(strings: Record<string, string>, key: string): string {
  return strings[key] ?? key;
}
