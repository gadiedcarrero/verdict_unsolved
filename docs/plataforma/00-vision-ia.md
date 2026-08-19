# Visión — NarraDos, plataforma de juegos asistida por IA

> **NarraDos** es el nombre de la **plataforma** (el motor que sirve para
> cualquier juego, no solo VERDICT: UNSOLVED — ese es el primer caso hecho
> con la herramienta, no la herramienta en sí). Los docs de guion/escenas/
> assets de un caso puntual van en `docs/<juego>/`, como
> `docs/verdict-unsolved/`. Para cuándo/cómo vender esto (no cómo se
> construye), ver `docs/plataforma/01-estrategia-comercial.md`.

## La idea, en una frase

El usuario entrega un **guion bien elaborado**. La IA principal (Claude, con
acceso de build/run/test sobre este repo) lo pule, arma los personajes, genera
sus imágenes, arma las escenas y crea las zonas interactivas. El humano se
dedica a **pulir la posición** de esas zonas — no a crearlas desde cero.

## Pipeline de producción

Cada paso ya tiene (o va a tener) su lugar concreto en el motor actual
(`src/game-engine/scene-engine/`, editor visual en `src/adventure/editor/`):

1. **Guion → guion pulido.** IA de texto (OpenAI) revisa/pule el guion que
   entrega el usuario. No inventa desde cero — parte de lo que el usuario ya
   escribió.
2. **Guion → roster de personajes.** Por cada personaje: nombre, color,
   descripción → **dos imágenes** (cabeza y cuello para el retrato de diálogo,
   cuerpo entero por si se necesita en escena). Encaja directo en
   `Character` (`characters.json`) y en el editor de personajes ya existente.
3. **Guion → escenas.** Fondos, capas de objetos, layout inicial.
4. **Escenas → zonas interactivas.** La IA propone las áreas (rect o polígono)
   sobre cada objeto relevante del guion — el usuario **ajusta la posición**
   a mano en el editor visual (esto ya funciona hoy: zonas libres, arrastrar,
   redimensionar).
5. **Diálogo.** Ya resuelto esta sesión: cada acción de un objeto
   (Examinar/Interactuar/Interactuar con) puede componer escena-que-activa +
   personaje-que-habla + texto, sin necesitar un nodo de diálogo armado a
   mano (ver `Scene.dialogueNodes` en `schemas.ts`).
6. **Audio de diálogo.** Pendiente — se va a generar con ElevenLabs por API,
   una vez que el texto esté cerrado (ver memoria `project_dialogue_audio_elevenlabs`).
7. **Video.** Seedance, para lo que necesite video generado en vez de capas
   estáticas — todavía sin diseñar cómo entra al motor.
8. **Minijuegos.** Sin resolver todavía — ver más abajo.

## Decisión: keys por proveedor, no un agregador único

Se evaluó usar una sola API que agrupe todos los proveedores pagos. **No hay
un agregador serio que cubra bien texto + imagen + audio + video a la vez.**
Los que agregan (OpenRouter y similares) son básicamente para LLMs de texto;
para audio ElevenLabs es mejor que cualquier wrapper genérico, y lo mismo para
imagen/video con proveedores específicos.

Esto se confirmó revisando **PressForge Studio** (proyecto hermano del
usuario, en `~/Desktop/ç` — el nombre de la carpeta es literalmente "ç", no
"PressForge Studio", ojo si se busca por nombre en Finder). PressForge no usa
un agregador: tiene su propia pantalla **"Ajustes → API Keys"** donde se carga
por separado `OPENAI_API_KEY` (guion, imágenes, voz OpenAI) y opcionalmente
`ELEVENLABS_API_KEY` (voz premium).

**Camino elegido:** el mismo patrón. ✅ **Implementado** — panel "Integraciones
IA" (`src/app/AiIntegrationsPanel.tsx`), abierto desde el selector de
proyectos porque es global a la plataforma, no por juego. Un slot de API key
por proveedor: OpenAI, ElevenLabs, imagen (OpenAI o Nano Banana), Seedance
(sin slot para Claude — no es una API que el juego corriendo llame en
runtime, es asistencia de programación durante el desarrollo). Las keys se
guardan vía IPC en `userData` (`electron/main/ipc/aiIntegrationsHandlers.ts`),
**fuera del repositorio** — no en `site-settings.json` ni ningún JSON que se
commitea a git, a propósito, para que una key real nunca llegue al historial.

## Qué ya existe hoy (cimiento para el pipeline)

Construido a lo largo de esta sesión, y donde el pipeline de IA va a escribir
sus resultados en cuanto exista:

- Motor de escenas data-driven (`schemas.ts` + Zod) — fondos, capas, hotspots
  rect/polígono, tipografía, colores, todo parametrizable por juego.
- Editor visual: crear/mover/redimensionar objetos, trazar zonas libres,
  arrastrar el tooltip, editor de personajes con retrato.
- Cursor custom por juego (default + hover), configurable en Ajustes.
- Menú de acción: 5 imágenes (normal + una por acción) + 4 zonas libres
  trazadas a mano sobre la imagen base — reemplaza al menú de verbos
  genérico. Examinar/Interactuar/Interactuar con configurables por objeto.
- Composer de diálogo: escena-que-activa + personaje + texto, sin nodo de
  diálogo armado a mano; se funde solo en `Scene.dialogueNodes`.
- Guardado real a disco vía IPC (`electron/main/ipc/sceneEditorHandlers.ts`)
  — todo lo que la IA genere puede escribirse por el mismo camino que ya usa
  el editor manual, sin una ruta de guardado aparte.

## Biblioteca de imágenes (historial por slot)

Requisito del usuario: para cualquier imagen (generada por IA o subida a
mano) tiene que poder (1) pedir que se **rehaga** si no le gusta, y (2)
**descargarla, retocarla en un programa externo, y subir su propia versión**
— más control, no queda atado a lo que devuelve la IA.

**Modelo elegido: galería por slot, no un pool central desacoplado.** Cada
slot de imagen (cursor default, cursor hover, cada una de las 5 del menú de
acción, cada fondo de escena, cada retrato de personaje) tiene **su propio
historial**: la imagen actual + todas las versiones anteriores, generadas o
subidas. Ni "regenerar" ni "subir una nueva" borra lo anterior — agrega una
versión y la marca como actual. Se puede volver a cualquier versión previa, y
descargar cualquiera de ellas en cualquier momento. Una imagen sigue
perteneciendo a un solo slot (no se comparte entre dos usos distintos) —
más simple, y no cambia cómo el motor ya referencia sus assets
(`SiteSettings.cursor.defaultCursorPath`, etc. siguen siendo una sola ruta:
la de la versión marcada como actual).

**Implica un cambio real de storage:** hoy cada subida (`scene-editor:save-cursor`,
`save-action-menu-image`, `save-background`, `save-portrait`) **sobrescribe**
el mismo archivo — no hay historial posible así. Para esto, cada subida
necesita un nombre de archivo versionado (no reusar el mismo nombre), y un
IPC nuevo para listar las versiones existentes de un slot (se puede derivar
del propio filesystem, listando archivos que matchean el patrón del slot,
sin necesitar una tabla/manifest aparte).

**Cuándo se construye:** no ahora. Hoy solo hay subida manual — con un único
archivo por slot el historial no aporta gran cosa. Se construye **junto con
la generación por IA** (cuando "rehacer" realmente empiece a producir
versiones para comparar), para diseñar el flujo de subida versionada y el de
regenerar por IA a la vez, en vez de migrar el storage dos veces.

## Problema abierto: minijuegos

Generar la **lógica** de un minijuego libre con IA no es confiable (mucho
código a mano por revisar, resultados dispares). Dirección propuesta —
**no implementada, para discutir cuando se llegue a este paso**:

Armar una biblioteca chica (4–5) de **plantillas de minijuego** ya
construidas y parametrizables en el motor (memoria de secuencia, conectar
cables, barra de timing tipo lockpicking, objeto oculto...). El trabajo de la
IA pasa a ser "elegir qué plantilla encaja con este punto del guion y
completar sus parámetros" (dificultad, tema visual, condición de victoria,
textos) — un problema mucho más chico y verificable que generar un motor de
juego nuevo cada vez.

## Próximo paso propuesto

La porción más chica y verificable de todo el pipeline: **dado un guion,
generar el roster de personajes + sus dos imágenes**. Ya existe el editor de
personajes y el slot de retrato — falta la key de OpenAI/imagen en Ajustes y
el llamado que arma el roster a partir del texto. Punto de partida natural
para probar el patrón completo (IA → JSON del motor → editor visual) antes de
extenderlo a escenas y zonas — y el punto donde conviene diseñar el storage
versionado de la Biblioteca de imágenes (arriba), ya que ahí es donde
"rehacer una imagen" empieza a importar de verdad.
