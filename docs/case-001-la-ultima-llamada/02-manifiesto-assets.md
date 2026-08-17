# Manifiesto de assets — Caso 001: "La última llamada"

## Estrategia de placeholder

El `SceneViewer` (por construir) va a buscar cada asset por **ruta relativa fija** dentro de `src/cases/case-001-la-ultima-llamada/assets/`. Mientras no exista el archivo final, el componente debe renderizar un **bloque de color + etiqueta de texto** con las mismas dimensiones/aspect ratio que tendrá la imagen real (esto se resuelve en el propio componente, con un `<img onError>` que cae a un `<div>` placeholder — no hace falta generar imágenes placeholder de verdad).

Esto significa: **no necesitas darme imágenes todavía**. Podemos construir y jugar las 15 escenas con rectángulos etiquetados ("OFICINA — fondo", "LENA — expresión asustada", etc.) y sustituir archivo por archivo según se vayan produciendo, sin tocar código ni datos.

Cuando haya arte, la única regla es: **mismo nombre de archivo, misma carpeta** listados abajo.

## Formato y resolución recomendados

- Fondos de escena: **1920×1080**, `.webp` (o `.png` si necesitan transparencia en alguna capa suelta).
- Capas de objeto sueltas (para permitir animación ligera / parallax independiente del fondo): `.png` con transparencia, mismo lienzo de referencia 1920×1080, recortadas a su bounding box real.
- Retratos de personaje: **800×800**, `.png` con transparencia, un archivo por expresión.
- Viñetas noir: **1920×1080**, `.webp`.

## Fondos (`assets/backgrounds/`)

| Archivo | Escena(s) | Notas |
|---|---|---|
| `oficina-noche-lluvia.webp` | 1, 2, 13, 15 | Fondo maestro reutilizado en Acto I, VI. Debe soportar overlay de llamada (Escena 2) y panel final (Escena 15) sin rehacerse. |
| `annex-pasillo.webp` | 7 | Recuerdo, tono desaturado/frío distinto al resto. |
| `annex-terminal-vigilancia.webp` | 7 | Voss tras cristal. |
| `halcyon-exterior.webp` | 6, 8 | Bajo lluvia, dos cámaras visibles como capas separadas (ver abajo). |
| `halcyon-pasillo.webp` | 9 | Debe soportar variante "cámara nueva visible" como capa activable. |
| `despacho-2b.webp` | 10 | Incluye división falsa donde está Daniel — mejor como capa aparte para poder ocultarla/revelarla. |
| `tunel-servicio.webp` | 12 (ruta A) | |
| `vestibulo.webp` | 12 (ruta B) | |
| `azotea.webp` | 12 (ruta C) | |
| `wraith-pov-generico.webp` | 11, 12 | Base para las escenas en primera persona de Wraith; puede reusar variantes de despacho/pasillo con tratamiento visual distinto (más frío, sin retratos). |

## Capas sueltas (`assets/layers/`)

Objetos individuales de la oficina (Escena 1), para que cada uno sea su propio hotspot:

`telefono.png`, `computadora-apagada.png`, `computadora-encendida.png`, `lampara-cenicero-cafe.png`, `fotografia-boca-abajo.png`, `fotografia-unidad-cero.png`, `sobre-alquiler.png`, `cajon-cerrado.png`, `archivadores-cajas.png`, `tablero-vacio.png`, `puerta-cristal.png`, `ventanas-lluvia-neon.png`, `rueda-silla-parcial.png`.

Halcyon / Despacho 2B: `camara-entrada-1.png`, `camara-entrada-2.png`, `camara-interior-no-planeada.png`, `unidad-janus.png`, `sangre-reciente.png`, `telefono-roto.png`, `foto-antigua-unidad-cero.png`, `division-falsa.png`.

## Retratos (`assets/portraits/`)

| Personaje | Expresiones necesarias |
|---|---|
| `director/` | `silueta.png`, `fragmento-manos.png`, `fragmento-rostro-parcial.png` (el guion pide **nunca** mostrar rostro completo — ver nota) |
| `mirror/` | sin retrato — solo interfaz de texto/voz |
| `lena/` | `neutral.png`, `asustada.png`, `defensiva.png` |
| `ghost/` | `neutral.png`, `desconfiada.png`, `tensa.png` |
| `patch/` | `neutral.png`, `nervioso.png`, `panico.png` |
| `rook/` | `neutral.png`, `alerta.png`, `esforzado.png` |
| `daniel/` | `consciente.png`, `inconsciente.png` |
| `voss/` | `instructor-tras-cristal.png` |
| `wraith/` | `silueta.png`, `manos-enguantadas.png` |
| `evelyn-iris/` | `fotografia-unidad-cero.png` (no es retrato en vivo, es la misma foto de grupo) |

> Nota de continuidad: el Director **nunca** debe tener un retrato de rostro completo — el guion (verdades secretas) exige que su identidad quede ambigua hasta casos futuros. Cualquier ilustrador que entre al proyecto necesita saber esta restricción antes de dibujar.

## Interfaces (`assets/ui/`, mayormente componentes de React/Tailwind, no imágenes)

`ZERO NETWORK`, `MIRROR`, mercado de agentes, tienda/loadout, módulo EYE, cámara corporal, registro de evidencias, informe de consecuencias — estas son pantallas construidas con componentes (como `MessagesApp.tsx` hoy), no ilustraciones. Solo necesitan dirección de arte (paleta, tipografía) una vez el resto del look esté definido, no assets individuales.

## Audio (`assets/audio/`)

| Archivo | Uso |
|---|---|
| `ambient-lluvia-neon.mp3` (loop) | Oficina, permanente |
| `telefono-ring.mp3` | Activación Escena 1 |
| `sonido-papel-zoom.mp3` | Inspección de fotografía |
| `pasos-recuerdo.mp3` | Escena 7 |
| `puerta-abrir.mp3`, `alarma.mp3`, `camara-shutter.mp3` | Genéricos, reusables en varias escenas |
| `respiracion-agente.mp3` | Variantes por agente bajo estrés (opcional para el slice) |
| *(silencio intencional)* | MIRROR nunca respira — no generar archivo, es una ausencia deliberada |

## Cuándo sí necesito imágenes tuyas

No para construir el flujo — para eso uso placeholders. Sí me sirven si en algún momento quieres que yo:
- Ajuste posiciones exactas de hotspots sobre una capa real (coordenadas x/y/width/height).
- Verifique que un recorte de capa tiene el canal alfa limpio antes de integrarlo.
- Adapte el `SceneViewer` a una relación de aspecto o estilo de parallax distinto al asumido aquí (1920×1080, capas planas).

Fuera de eso, puedes seguir produciendo arte en paralelo mientras avanzamos con la lógica.
