import { z } from 'zod';

/**
 * Motor de datos para casos tipo "aventura por capas" (Caso 001 "La última
 * llamada" en adelante). Ver docs/verdict-unsolved/01-mapeo-escenas.md.
 */

/** Compartida por la tipografía de menús, títulos y tooltips de hotspot. */
export const FontFamilySchema = z.enum(['sans', 'serif', 'mono', 'comic-sans']);

export const SceneLayerSchema = z.object({
  id: z.string(),
  /** Ruta relativa dentro de assets/layers o assets/backgrounds. Si el
   * archivo no existe todavía, SceneViewer cae a un placeholder con esta
   * misma ruta como etiqueta. */
  assetPath: z.string(),
  x: z.number(),
  y: z.number(),
  width: z.number().optional(),
  height: z.number().optional(),
  zIndex: z.number().default(0),
  /** Si esta capa es un personaje del roster (no un objeto suelto): de qué
   * personaje/variante/expresión salió `assetPath`. `assetPath` sigue siendo
   * la imagen concreta que se dibuja — esto es su procedencia, y sirve para
   * dos cosas que con una ruta suelta no se pueden hacer: que el editor
   * ofrezca un selector de personaje en vez de pedir la ruta a mano, y que
   * el runtime cambie el sprite cuando ese personaje habla con otra emoción
   * (reusando `layerOverrides` de SceneViewer, que ya existe para eso). */
  character: z
    .object({
      characterId: z.string(),
      variantId: z.string(),
      /** Ausente = el sprite neutral de la variante (`CharacterVariant.body`). */
      expression: z.string().optional(),
    })
    .optional(),
});

export const InterfaceIdSchema = z.enum(['mirror-investigation', 'agent-market', 'equipment-shop']);

export const VariableValueSchema = z.union([z.string(), z.number(), z.boolean()]);

/** Comparación contra una variable. El atajo (un valor pelado) es igualdad,
 * que es el 90% de los casos: `{ JANUS_FOUND: true }`. La forma larga es para
 * rangos: `{ alarmLevel: { op: 'gte', value: 3 } }`. */
export const ComparisonSchema = z.union([
  VariableValueSchema,
  z.object({
    op: z.enum(['eq', 'ne', 'gt', 'gte', 'lt', 'lte']),
    value: VariableValueSchema,
  }),
]);

/** Condición evaluada contra el estado de la partida. Todos los términos se
 * cumplen a la vez (AND); una condición vacía siempre se cumple.
 *
 * No hay OR ni anidamiento a propósito: cada vez que un guion pide un OR,
 * casi siempre lo que quiere es una variable con nombre propio
 * (`PUEDE_ENTRAR`) puesta por quien corresponda — eso se lee mucho mejor en
 * el editor que un árbol booleano, y deja el rastro de por qué se cumplió. */
export const ConditionSchema = z.object({
  /** Flags que tienen que estar presentes. */
  flags: z.array(z.string()).default([]),
  /** Flags que NO tienen que estar. */
  notFlags: z.array(z.string()).default([]),
  /** Variable → valor esperado. Una variable que nunca se escribió no cumple
   * ninguna comparación salvo `ne`. */
  variables: z.record(z.string(), ComparisonSchema).default({}),
});

// Compartidas entre SceneActionSchema (todas) y MinigameOutcomeActionSchema
// (el subconjunto permitido como onSuccess/onFail de un minijuego) — así
// onSuccess/onFail no necesitan referenciarse a sí mismos (Zod no soporta
// bien discriminatedUnion recursivo) y de paso no tiene sentido encadenar
// un minijuego adentro de otro, ni "Continuar"/"Salir" como resultado.
const OUTCOME_ACTION_VARIANTS = [
  z.object({ type: z.literal('dialogue'), nodeId: z.string() }),
  z.object({
    type: z.literal('setState'),
    patch: z.record(z.string(), z.unknown()),
  }),
  z.object({ type: z.literal('addFlag'), flag: z.string() }),
  /** Escribe una variable de guion (ver `AdventureCaseState.variables`).
   * `setState` de arriba es el equivalente viejo, limitado a los campos
   * cableados de VERDICT: UNSOLVED — para un juego nuevo va este. */
  z.object({
    type: z.literal('setVariable'),
    name: z.string(),
    value: VariableValueSchema,
  }),
  /** Suma una pista de las que declara la investigación de la escena (ver
   * `InvestigationSchema.clues`). Descubrir dos veces la misma no cuenta
   * doble: es lo que deja poner la acción en una zona repetible sin que el
   * contador se dispare al volver a mirar lo mismo. */
  z.object({ type: z.literal('discoverClue'), clueId: z.string() }),
  /** Cambia el objetivo visible sin cambiar de escena. */
  z.object({ type: z.literal('setObjective'), objective: z.string() }),
  z.object({
    type: z.literal('transitionTo'),
    sceneId: z.string(),
    fade: z.enum(['cut', 'fade', 'fadeToBlack']).default('fade'),
    /** Qué fondo de `sceneId` queda activo al llegar — si no está, se usa
     * el default de esa escena (`backgrounds[0]`). Si `sceneId` es la
     * escena en la que ya se está, esto se comporta como `setBackground`
     * (sin fundido ni re-disparar `onEnter`) en vez de una transición de
     * verdad — ver runActions en adventureRuntime.store.ts. Pensado para
     * que el editor pueda ofrecer un solo selector "escena → uno de sus
     * fondos" que sirva tanto para saltar a otra escena en un fondo
     * puntual como para cambiar el fondo de la escena actual. */
    backgroundId: z.string().optional(),
  }),
  z.object({ type: z.literal('openInterface'), interfaceId: InterfaceIdSchema }),
  z.object({ type: z.literal('addMoney'), amount: z.number() }),
  /** Alterna el fondo activo de la escena actual entre dos backgrounds
   * (por id) — p. ej. una lámpara que muestra "luz encendida"/"luz
   * apagada". Si ninguno de los dos está activo todavía (fondo por
   * defecto = backgrounds[0]), el primer click pasa al que no sea el
   * default. */
  z.object({ type: z.literal('toggleBackground'), backgroundIdA: z.string(), backgroundIdB: z.string() }),
  /** Pone un fondo puntual como activo, sin importar cuál esté ahora — a
   * diferencia de `toggleBackground` (pensado para un interruptor de 2
   * estados), esto sirve para avanzar un panel a la vez en una escena tipo
   * "secuencia cinemática" (ver `onShow` de DialogueNode): cada nodo de la
   * secuencia pone el fondo del panel que le corresponde al mostrarse. */
  z.object({ type: z.literal('setBackground'), backgroundId: z.string() }),
] as const;

export const MinigameOutcomeActionSchema = z.discriminatedUnion('type', OUTCOME_ACTION_VARIANTS);

/** Plantillas de minijuego ya construidas en el motor — la IA/el editor
 * elige cuál encaja con el punto del guion y completa sus parámetros, en
 * vez de generar lógica de juego nueva cada vez (ver
 * docs/plataforma/00-vision-ia.md, "Problema abierto: minijuegos"). */
export const MinigameTemplateSchema = z.enum(['sequence']);

export const SceneActionSchema = z.discriminatedUnion('type', [
  ...OUTCOME_ACTION_VARIANTS,
  /** Abre un minijuego — el motor corre `onSuccess` o `onFail` según el
   * resultado y cierra el overlay. Solo dispara la interacción "Interactuar"
   * de un objeto (no Examinar/Interactuar con), ver editor. */
  z.object({
    type: z.literal('openMinigame'),
    template: MinigameTemplateSchema,
    /** Solo `template: "sequence"` por ahora — cuántos pasos hay que
     * repetir. Si se suman más templates, esto pasa a ser una unión
     * discriminada por `template` en vez de un campo plano. */
    sequenceLength: z.number().default(4),
    onSuccess: z.array(MinigameOutcomeActionSchema),
    onFail: z.array(MinigameOutcomeActionSchema),
  }),
  /** Botón de menú "Continuar": retoma la partida guardada en la escena
   * donde estaba, o no hace nada si todavía no hay ninguna registrada. */
  z.object({ type: z.literal('continueGame') }),
  /** Botón de menú "Salir": cierra la ventana (y la app, salvo en macOS). */
  z.object({ type: z.literal('quitApp') }),
]);

/** Tipografía completa — usada para los defaults generales del sitio
 * (SiteSettings). Cada campo tiene su propio default razonable. */
export const TextStyleSchema = z.object({
  fontFamily: FontFamilySchema.default('sans'),
  fontSize: z.number().default(10),
  color: z.string().default('#e6eaef'),
});

/** Igual que TextStyleSchema pero todo opcional — un override parcial que
 * pisa solo los campos presentes, el resto sigue viniendo del default
 * general del sitio. Ver resolveTextStyle en src/adventure/textStyle.ts. */
export const TextStyleOverrideSchema = z.object({
  fontFamily: FontFamilySchema.optional(),
  fontSize: z.number().optional(),
  color: z.string().optional(),
});

export const PolygonPointSchema = z.object({ x: z.number(), y: z.number() });

export const HotspotShapeSchema = z.enum(['rect', 'polygon']);

/** Una combinación posible para "Interactuar con": clickear este objeto,
 * elegir Interactuar con, y después clickear `targetObjectId` — si existe
 * una entrada para ese par, corre `onInteract`; si no, el juego muestra un
 * mensaje genérico (ver `interactWith.noMatch` en locales) y cancela el
 * modo combinar. */
export const InteractWithTargetSchema = z.object({
  targetObjectId: z.string(),
  onInteract: z.array(SceneActionSchema),
});

export const HotspotSchema = z.object({
  id: z.string(),
  /** Clave de traducción (ver locales/es.json del caso), no el texto en sí —
   * así el nombre que aparece al pasar el mouse puede traducirse a otros
   * idiomas más adelante sin tocar la escena. */
  label: z.string(),
  /** Bounding box — para "polygon" es el rectángulo que contiene a
   * `points` (se recalcula solo al editar la forma); para "rect" es el
   * área real clickeable. */
  area: z.object({
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
  }),
  /** "rect" = rectángulo de siempre. "polygon" = forma libre trazada a
   * click en el editor (como un path de Illustrator), para objetos
   * irregulares — usa `points` en vez de `area` para el área real. */
  shape: HotspotShapeSchema.default('rect'),
  /** Solo `shape: "polygon"`: vértices en % del stage, en orden. */
  points: z.array(PolygonPointSchema).optional(),
  onInteract: z.array(SceneActionSchema),
  repeatable: z.boolean().default(true),
  /** Si es false, la zona existe (para referencia/edición) pero no responde
   * al mouse durante la partida — p. ej. un objeto decorativo marcado. Es una
   * decisión de autoría fija, no una condición: para "todavía no, pero
   * después sí" están los dos campos de abajo. */
  interactable: z.boolean().default(true),
  /** Mientras no se cumpla, la zona no existe para el jugador: no se dibuja,
   * no responde, no aparece su tooltip. Para lo que todavía no fue revelado
   * — la puerta detrás de la caja que aún no se movió. */
  visibleWhen: ConditionSchema.optional(),
  /** La zona SÍ se ve, pero al hacer click no corre `onInteract`: responde
   * `disabledMessage`. Es el otro caso, y es distinto del de arriba — "no
   * puedo mover esto desde la silla" tiene que verse para que el jugador
   * entienda que ahí hay algo y que le hace falta otra cosa. Esconderlo lo
   * dejaría buscando a ciegas. */
  enabledWhen: ConditionSchema.optional(),
  /** Clave de traducción (como `label`) del texto que responde la zona
   * cuando `enabledWhen` no se cumple. Sin esto, una zona deshabilitada
   * simplemente no reacciona. */
  disabledMessage: z.string().optional(),
  /** Pisa, campo a campo, la tipografía general del sitio
   * (SiteSettings.hotspotLabelStyle) para el tooltip de esta zona. */
  labelStyle: TextStyleOverrideSchema.optional(),
  /** Posición del tooltip, en % del stage — si no está, se calcula sola
   * (centro-arriba del bounding box). Se arrastra desde el editor. */
  labelOffset: PolygonPointSchema.optional(),
  /** Si es true, un click abre el menú de acción de 4 imágenes (Examinar/
   * Interactuar/Interactuar con/Cerrar) configurado en
   * SiteSettings.actionMenu, en vez de correr `onInteract` directo. */
  actionMenuEnabled: z.boolean().default(false),
  /** Solo si `actionMenuEnabled`. */
  onExamine: z.array(SceneActionSchema).default([]),
  /** Solo si `actionMenuEnabled` — "Interactuar" reusa `onInteract` de
   * arriba (mismo campo que el click único de siempre). "Interactuar con"
   * no corre una acción fija: ver `interactWithTargets`. */
  interactWithTargets: z.array(InteractWithTargetSchema).default([]),
});

export const CharacterExpressionSchema = z.object({
  /** null = todavía no se generó/subió imagen para esta expresión (existe
   * como entrada propuesta, p. ej. una identidad alternativa detectada por
   * el desglose de guion, pendiente de generar). */
  path: z.string().nullable(),
  /** Descripción visual autocontenida de ESTA apariencia — se manda tal
   * cual al generador de imagen; nunca debe depender de `Character.description`
   * ni mencionar otras apariencias del mismo personaje (ver
   * docs/plataforma/00-vision-ia.md, identidades alternativas). */
  description: z.string().default(''),
});

/** Una *variante* es una identidad visual completa del mismo personaje
 * ("Adrián joven", "Adrián en silla de ruedas", "Adrián encapuchado"): una
 * sola pose de cuerpo fija más sus propias expresiones faciales. Es un nivel
 * aparte de `Character.expressions` a propósito — ese record es plano y mezcla
 * emoción con look (ver la clave suelta `june-sato-cautiva`), así que no puede
 * expresar "esta variante, con esta cara" sin escribir a mano cada
 * combinación. Acá el costo de generación es variantes × expresiones, no
 * variantes × poses × expresiones × escenas.
 *
 * Ojo con qué NO es una variante: un personaje que el jugador conoce como
 * otra persona (Gray, Wraith) necesita nombre y color propios y no puede
 * delatar el vínculo desde el dato mismo — eso son entradas separadas del
 * roster, como ya están hoy. */
export const CharacterVariantSchema = z.object({
  /** Nombre legible para el editor ("Adrián joven"). Nunca se le muestra al
   * jugador: el nombre que ve sigue siendo `Character.name`. */
  label: z.string().default(''),
  /** Descripción visual autocontenida de ESTA variante — mismo criterio que
   * `CharacterExpression.description`: se manda tal cual al generador y no
   * debe depender de `Character.description` ni de otras variantes. */
  description: z.string().default(''),
  /** Sprite de cuerpo entero en la pose fija de esta variante, o null si
   * todavía no se generó. Cumple dos papeles: es la imagen por defecto en
   * escena, y es la referencia de identidad con la que se generan sus
   * expresiones (misma relación que `portrait` ↔ `expressions` en el busto). */
  body: z.string().nullable().default(null),
  /** Expresión → sprite de cuerpo entero de esta misma variante con ese
   * gesto. La pose corporal no cambia entre expresiones, solo la cara. */
  expressions: z.record(z.string(), CharacterExpressionSchema).default({}),
});

export const CharacterSchema = z.object({
  id: z.string(),
  /** Clave de traducción del nombre mostrado (ver locales/es.json). */
  name: z.string(),
  /** Ruta al retrato "por defecto" dentro de assets/portraits, o null si no
   * tiene retrato (p. ej. "sistema" para texto de narrador/interfaz). Se usa
   * cuando un DialogueNode no pide una expresión particular, o pide una que
   * no existe en `expressions`. */
  portrait: z.string().nullable(),
  /** Descripción visual del look base/neutral — usada para (re)generar
   * `portrait` con IA. Vacía en personajes creados a mano sin ese paso. */
  description: z.string().default(''),
  /** Expresión (clave libre, p. ej. "enojado", "sonriendo", o una identidad
   * alternativa completa como "wraith") → retrato adicional del mismo
   * personaje. Referenciada por `DialogueNode.portraitExpression`. */
  expressions: z.record(z.string(), CharacterExpressionSchema).default({}),
  /** Identidad visual (clave libre, p. ej. "joven", "silla-de-ruedas") →
   * cuerpo entero de esa versión del personaje, para ponerlo EN la escena
   * (ver `CharacterVariantSchema`). `portrait`/`expressions` de arriba
   * siguen siendo el busto del círculo de diálogo: son sistemas paralelos,
   * no uno reemplaza al otro. Vacío = personaje que solo habla por retrato y
   * nunca aparece de cuerpo entero. */
  variants: z.record(z.string(), CharacterVariantSchema).default({}),
  /** Código de idioma corto (p. ej. "en", "es") → voice_id de ElevenLabs
   * asignado a este personaje en ese idioma. El juego arranca solo con
   * texto — esto queda guardado para cuando se genere el audio de diálogo
   * (ver memoria project_dialogue_audio_elevenlabs). Un mismo personaje
   * puede tener una voz distinta por idioma, no una sola voz "traducida". */
  voices: z.record(z.string(), z.string()).default({}),
  /** Color del nombre y del texto de diálogo, en hex (p. ej. "#e0a636"). */
  color: z.string(),
});

export const DialogueChoiceSchema = z.object({
  id: z.string(),
  text: z.string(),
  next: z.string(),
  setState: z.record(z.string(), z.unknown()).optional(),
  addFlag: z.string().optional(),
});

export const DialogueNodeSchema = z.object({
  id: z.string(),
  /** Id de un personaje del roster del caso (characters.json), no el nombre
   * mostrado — el retrato, color y nombre traducido se resuelven desde ahí. */
  speaker: z.string(),
  portraitExpression: z.string().optional(),
  line: z.string(),
  /** Bloque de texto monoespaciado tipo terminal (ZERO NETWORK, MIRROR, avisos del sistema). */
  terminalBlock: z.string().optional(),
  choices: z.array(DialogueChoiceSchema).optional(),
  /** Si no hay choices, "continuar" avanza automáticamente a este nodo. */
  next: z.string().optional(),
  /** Acciones adicionales a ejecutar en cuanto el nodo se muestra (setState, addFlag). */
  onShow: z.array(SceneActionSchema).optional(),
});

export const SceneBackgroundSchema = z.object({
  /** Auto-generado al crearlo en el editor: "bg-1", "bg-2"... */
  id: z.string(),
  /** Nombre legible para el editor (ej. "Luz apagada") — para reconocer
   * este fondo puntual al enlazarlo desde el selector escena→fondo de una
   * interacción, en vez de un "bg-2" sin contexto. Vacío/ausente = el
   * editor cae al id. Nunca se le muestra al jugador. */
  title: z.string().optional(),
  assetPath: z.string(),
  /** Solo se usa en escenas `kind: "intro"`: cuánto se muestra este fondo
   * antes de pasar al siguiente, en milisegundos. Si no está, se usa un
   * valor por defecto (ver IntroScene.tsx). */
  durationMs: z.number().optional(),
  /** Solo `kind: "intro"`: color sólido (hex) detrás de la imagen — para un
   * logo que no ocupa toda la pantalla, en vez de dejar el fondo transparente. */
  backgroundColor: z.string().optional(),
  /** Solo `kind: "intro"`: ancho de la imagen como % del stage, centrada y
   * sin recortar (útil para logos). Si no está, la imagen cubre toda la
   * pantalla como un fondo de escena normal. */
  imageWidthPercent: z.number().optional(),
  /** Solo `kind: "cinematica"`: texto que acompaña a este panel puntual
   * mientras se muestra — literal, no clave de traducción (mismo criterio
   * que DialogueNode.line/DialogueChoice.text: esto se escribe a mano por
   * escena, no se arma con el compositor de acciones). Más adelante puede
   * sumarse un audio narrado en vez de/además de esto (ver memoria
   * project_dialogue_audio_elevenlabs) — el campo queda aparte a propósito
   * para no tener que migrar nada cuando eso se construya. */
  caption: z.string().optional(),
  /** Zonas interactivas propias de ESTE fondo puntual — no de la escena
   * entera. Antes vivían en `Scene.hotspots`, compartidas por todos los
   * fondos de la escena; eso impedía cosas como "al apagar la luz aparece
   * una caja fuerte que no se veía antes" (la zona de la caja fuerte tiene
   * que existir solo en el fondo "luz apagada"). Una zona que deba
   * responder en varios fondos (una puerta que siempre está ahí) se repite
   * a mano en cada uno — no hay "zona compartida" implícita. Escenas
   * viejas guardadas antes de este campo migran solas al cargar (ver
   * migrateLegacySceneFields más abajo): sus `hotspots` de escena pasan
   * al primer fondo. */
  hotspots: z.array(HotspotSchema).default([]),
  /** Prompt que se usó para generar esta imagen con IA — `undefined` si se
   * subió a mano o se generó antes de que este campo existiera. Se guarda
   * para poder mostrarlo precargado (y editable) al regenerar esta misma
   * imagen desde cero, en vez de arrancar de un cuadro de texto vacío. */
  generationPrompt: z.string().optional(),
  /** Ids de personajes cuyo retrato se mandó como referencia al generar
   * esta imagen — mismo criterio que `generationPrompt`, para precargar la
   * selección al regenerar. */
  generationCharacterIds: z.array(z.string()).optional(),
  /** Personajes (u otro arte con posición/tamaño propios) superpuestos a
   * ESTE fondo puntual — no de la escena entera, mismo motivo que
   * `hotspots`: un personaje que sale en un panel de una secuencia
   * cinemática no tiene por qué seguir ahí en el siguiente. Antes vivían en
   * `Scene.layers`, compartidas por todos los fondos de la escena. Escenas
   * viejas guardadas antes de este campo migran solas al cargar (ver
   * migrateLegacySceneFields más abajo): sus `layers` de escena pasan al
   * primer fondo. */
  layers: z.array(SceneLayerSchema).default([]),
});

export const SceneKindSchema = z.enum(['standard', 'intro', 'menu', 'cinematica', 'minigame']);

/** Solo `kind: "cinematica"`. "fade" ya está implementado (cross-fade
 * simple entre paneles). "comic" queda como opción seleccionable pero sin
 * comportamiento propio todavía (usa el mismo fade por ahora) — el
 * usuario todavía tiene que definir cómo se ve esa transición tipo viñeta
 * de cómic antes de construirla. */
export const CinematicTransitionSchema = z.enum(['fade', 'comic']);

export const MenuButtonSchema = z.object({
  /** Auto-generado al crearlo en el editor. */
  id: z.string(),
  /** Clave de traducción (igual que Hotspot.label), no el texto en sí. */
  label: z.string(),
  onClick: z.array(SceneActionSchema),
});

export const MenuPositionSchema = z.enum(['left', 'center', 'right']);
export const MenuButtonStyleSchema = z.enum(['bordered', 'frameless', 'filled']);

export const MenuAppearanceSchema = z.object({
  /** Dónde se agrupan los botones en el stage. */
  position: MenuPositionSchema.default('center'),
  /** "bordered" = cuadrado con marco, "frameless" = solo texto, "filled" = relleno sólido. */
  buttonStyle: MenuButtonStyleSchema.default('bordered'),
  fontFamily: FontFamilySchema.default('sans'),
  fontSize: z.number().default(16),
  /** Color del texto/marco en reposo, en hex. */
  fontColor: z.string().default('#e6eaef'),
  /** Color del texto/marco (o relleno, si buttonStyle es "filled") al pasar el mouse. */
  hoverColor: z.string().default('#e0a636'),
});

export const MenuTitleSchema = z.object({
  /** Clave de traducción (igual que MenuButton.label), no el texto en sí. */
  text: z.string(),
  fontFamily: FontFamilySchema.default('serif'),
  fontSize: z.number().default(48),
  color: z.string().default('#e6eaef'),
});

/** Mueve un campo-arreglo que antes vivía a nivel Scene (compartido por
 * todos los fondos) al primer fondo, bajo el mismo nombre — usada para
 * `hotspots` (ver SceneBackground.hotspots) y `layers` (ver
 * SceneBackground.layers), los dos campos que pasaron de "por escena" a
 * "por fondo". Si el primer fondo ya tiene ese campo (escena migrada o
 * creada después del cambio), no se toca nada. */
function migrateLegacySceneArrayField(raw: Record<string, unknown>, field: string): Record<string, unknown> {
  const legacyValue = raw[field];
  if (!Array.isArray(legacyValue) || legacyValue.length === 0) return raw;
  const backgroundsRaw = raw['backgrounds'];
  if (!Array.isArray(backgroundsRaw) || backgroundsRaw.length === 0) return raw;
  // `Array.isArray` narrows a lib.es5 `unknown` value to `any[]`, no `unknown[]`
  // — el cast explícito evita que el resto del bloque quede "any" sin querer.
  const backgrounds = backgroundsRaw as unknown[];
  const [firstBackground, ...restBackgrounds] = backgrounds;
  const firstBackgroundObj =
    firstBackground && typeof firstBackground === 'object' ? (firstBackground as Record<string, unknown>) : {};
  if (Array.isArray(firstBackgroundObj[field])) return raw;
  const { [field]: _legacyValue, ...rest } = raw;
  return {
    ...rest,
    backgrounds: [{ ...firstBackgroundObj, [field]: legacyValue }, ...restBackgrounds],
  };
}

/** Antes de que existieran `SceneBackground.hotspots`/`SceneBackground.layers`,
 * esos dos campos vivían juntos a nivel Scene, compartidos por todos sus
 * fondos. Las escenas guardadas con ese formato viejo siguen teniendo esos
 * campos en su JSON — esto corre ANTES de la validación de Zod (que ya no
 * los conoce a nivel Scene y los descartaría en silencio) y los mueve al
 * primer fondo, para no perder ninguna zona/capa ya trazada a mano. */
function migrateLegacySceneFields(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') return raw;
  let r = raw as Record<string, unknown>;
  r = migrateLegacySceneArrayField(r, 'hotspots');
  r = migrateLegacySceneArrayField(r, 'layers');
  return r;
}

export const ClueSchema = z.object({
  id: z.string(),
  /** Clave de traducción del enunciado ("Daniel trabajó para Acheron") — se
   * muestra al descubrirla y después en el panel de pistas. */
  text: z.string(),
  /** Evidencia que sigue importando después de cerrar esta investigación
   * ("Ellos saben cómo decide la gente", "Adrian Cross podría estar vivo").
   * El panel la muestra aparte y para siempre, no solo mientras se está en la
   * escena que la dio. Sigue contando como pista normal para SOLUCIONAR acá:
   * lo que cambia es cuánto dura, no qué hace. */
  global: z.boolean().default(false),
});

export const DeductionAnswerSchema = z.object({
  id: z.string(),
  text: z.string(),
});

/** La pregunta que separa "junté las pruebas" de "entendí lo que significan".
 * Sin esto, SOLUCIONAR valida solo — el "modo simple". */
export const DeductionSchema = z.object({
  question: z.string(),
  answers: z.array(DeductionAnswerSchema).default([]),
  correctAnswerId: z.string(),
  /** Clave del aviso cuando la conclusión no se sostiene. Fallar no cuesta
   * nada más que volver a intentar: el castigo es no avanzar, no perder. */
  wrongMessage: z.string().default('deduction.wrong'),
});

/** El loop de una escena de investigación: un objetivo visible, N pistas por
 * encontrar, y un botón que solo se habilita cuando están.
 *
 * El objetivo se declara acá y vive en el estado de la partida a partir de
 * que se entra a la escena, porque puede cambiar sin cambiar de escena (la
 * acción `setObjective`) — "Familiarízate con Zero Network" pasa a "Contesta
 * la llamada" cuando suena el teléfono, en el mismo cuarto. */
export const InvestigationSchema = z.object({
  /** Clave de traducción del objetivo con el que arranca la escena. */
  objective: z.string(),
  clues: z.array(ClueSchema).default([]),
  /** Cuántas pistas habilitan SOLUCIONAR. 0 = todas las de `clues`. Se deja
   * configurable porque una escena puede ofrecer pistas opcionales de más
   * (el doc distingue INFORMACIÓN de PISTA: si todo lo que se clickea diera
   * progreso, encontrar la pista correcta dejaría de tener valor). */
  requiredClues: z.number().default(0),
  deduction: DeductionSchema.optional(),
  /** Qué pasa al resolver: con deducción, al acertar; sin ella, al pulsar
   * SOLUCIONAR con las pistas completas. */
  onSolved: z.array(SceneActionSchema).default([]),
});

const SceneObjectSchema = z.object({
  id: z.string(),
  /** Nombre legible para el editor (ej. "Oficina de Gray") — el `id` sigue
   * siendo el slug técnico usado en referencias (transitionTo, etc.).
   * Vacío/ausente = el editor cae al id como texto de respaldo. Puramente
   * de organización interna, nunca se le muestra al jugador. */
  title: z.string().optional(),
  act: z.number(),
  /** "intro" es una escena especial de solo fondos (logos, splash) que pasa
   * de uno a otro por tiempo y termina disparando `onIntroComplete` — sin
   * capas, hotspots ni diálogo. "menu" es un fondo con botones (título,
   * menú de inicio). "cinematica" es una secuencia de paneles (fondo +
   * texto acompañante) que se reproduce sola y dispara
   * `onCinematicComplete` al terminar — para momentos tipo "5 escenas
   * pasando una detrás de otra" que no son ni un cuarto explorable ni un
   * splash mudo. Cualquier otra escena es "standard" (point-and-click). */
  kind: SceneKindSchema.default('standard'),
  /** Una escena puede tener varios fondos (luz prendida/apagada, flashes de
   * relámpago, etc.) — el primero de la lista es el que se ve por defecto.
   * Cada fondo trae sus propias zonas interactivas (ver
   * SceneBackground.hotspots) — no hay una lista de zonas a nivel escena. */
  backgrounds: z.array(SceneBackgroundSchema),
  /** Nodos de diálogo de una sola línea, generados por el editor visual al
   * definir qué dice un personaje en una acción de un objeto (Examinar/
   * Interactuar/Interactuar con) — clave = id autogenerado
   * `dialogue.<escena>.<objeto>.<slot>`, referenciado desde el
   * `onInteract`/etc. del hotspot como `{type:'dialogue', nodeId}`. Se
   * funden con el diccionario `dialogues` del bundle al cargar (ver
   * loadAdventureCase.ts) — viven acá y no en dialogues/*.json porque ese
   * archivo es para el guion armado a mano, no para reacciones puntuales. */
  dialogueNodes: z.record(z.string(), DialogueNodeSchema).default({}),
  /** Acciones que corren automáticamente al entrar a la escena (p. ej. abrir un diálogo). */
  onEnter: z.array(SceneActionSchema).optional(),
  /** Convierte esta escena en una escena de investigación: objetivo visible,
   * contador de pistas y botón SOLUCIONAR (ver `InvestigationSchema`).
   * Ausente = escena normal, sin HUD de investigación. */
  investigation: InvestigationSchema.optional(),
  /** `kind: "intro"` o `"cinematica"`: si se puede saltar la secuencia con
   * un botón en vez de esperar a que termine sola. El nombre quedó de
   * cuando solo existía "intro" — se reutiliza tal cual para "cinematica"
   * en vez de duplicar un campo idéntico. */
  introSkippable: z.boolean().default(true),
  /** Solo `kind: "intro"`: acciones al terminar la secuencia (por tiempo) o
   * al saltarla con el botón — típicamente un `transitionTo` al menú. */
  onIntroComplete: z.array(SceneActionSchema).optional(),
  /** Solo `kind: "cinematica"`: qué tipo de transición usar entre paneles
   * — ver CinematicTransitionSchema. */
  cinematicTransition: CinematicTransitionSchema.default('fade'),
  /** Solo `kind: "cinematica"`: acciones al terminar la secuencia (por
   * tiempo) o al saltarla — típicamente un `transitionTo` a la escena que
   * sigue narrativamente. Campo aparte de `onIntroComplete` a propósito,
   * aunque el patrón sea el mismo: nombrarlo "intro" en una cinemática
   * sería confuso al leer el JSON/el editor. */
  onCinematicComplete: z.array(SceneActionSchema).optional(),
  /** Solo `kind: "menu"`: título mostrado arriba de los botones, alineado
   * con `menuAppearance.position`. `null`/ausente = sin título. */
  menuTitle: MenuTitleSchema.nullable().default(null),
  /** Solo `kind: "menu"`: los botones del menú, en orden. */
  menuButtons: z.array(MenuButtonSchema).default([]),
  /** Solo `kind: "menu"`: posición y estilo visual de los botones. */
  menuAppearance: MenuAppearanceSchema.default({
    position: 'center',
    buttonStyle: 'bordered',
    fontFamily: 'sans',
    fontSize: 16,
    fontColor: '#e6eaef',
    hoverColor: '#e0a636',
  }),
  /** Solo `kind: "minigame"`: la escena ENTERA es este minijuego a pantalla
   * completa, sin fondo/zonas propios — distinto del minijuego de zona
   * (Hotspot.onInteract → openMinigame, un overlay sobre una escena
   * interactiva ya existente). `undefined` = todavía sin configurar, la
   * escena no hace nada al entrar. */
  minigameTemplate: MinigameTemplateSchema.optional(),
  /** Solo `template: "sequence"` por ahora — mismo campo y mismo caveat que
   * el minijuego de zona (ver SceneActionSchema, caso "openMinigame"). */
  minigameSequenceLength: z.number().default(4),
  /** Acciones al resolver con éxito — típicamente un `transitionTo` (con o
   * sin `backgroundId`) de vuelta a la escena desde la que se entró, o a
   * la que sigue narrativamente. Mismo subconjunto que el `onSuccess` de un
   * `openMinigame` de zona (ver OUTCOME_ACTION_VARIANTS) — nunca otro
   * `openMinigame`/`continueGame`/`quitApp` anidado ahí. */
  onMinigameSuccess: z.array(MinigameOutcomeActionSchema).default([]),
  /** Acciones al fracasar — mismo criterio que onMinigameSuccess. */
  onMinigameFail: z.array(MinigameOutcomeActionSchema).default([]),
});

export const SceneSchema = z.preprocess(migrateLegacySceneFields, SceneObjectSchema);

export const AdventureCaseMetaSchema = z.object({
  id: z.string(),
  title: z.string(),
  clientName: z.string(),
  premise: z.string(),
  startingSceneId: z.string(),
});

export const InvestigationAreaSchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
});

export const MirrorHintSchema = z.object({
  level: z.number(),
  label: z.string(),
  text: z.string(),
});

const StatLevelSchema = z.enum(['baja', 'media', 'alta']);

export const AgentDefSchema = z.object({
  id: z.enum(['ghost', 'patch', 'rook']),
  name: z.string(),
  codename: z.string(),
  cost: z.number(),
  infiltration: StatLevelSchema,
  technique: StatLevelSchema,
  resistance: StatLevelSchema,
  trustInitial: z.number(),
  advantage: z.string(),
  disadvantage: z.string(),
});

export const EquipmentItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number(),
  function: z.string(),
  riskLabel: z.string(),
});

/** Cómo se ve el cursor del mouse en este juego — esta es una plataforma
 * para hacer varios juegos, así que ni el ícono por defecto ni el de "esto
 * es interactuable" deberían quedar fijos (una lupa tiene sentido acá, en
 * otro juego podría ser una banana). Rutas relativas dentro de
 * assets/games/<gameId>/cursors/, o null = cursor normal del sistema. */
export const CursorSettingsSchema = z.object({
  defaultCursorPath: z.string().nullable().default(null),
  /** Se usa en vez del anterior al pasar el mouse sobre una zona interactuable. */
  hoverCursorPath: z.string().nullable().default(null),
});

/** El "menú de acción" es la interfaz que reemplaza al click único en
 * cualquier objeto con `Hotspot.actionMenuEnabled`: Examinar/Interactuar/
 * Interactuar con/Cerrar, las 4 funciones que tienen todos los juegos
 * point-and-click. El arte es 100% custom por juego (5 imágenes: una base
 * "normal" que aparece al primer click, y una por acción que la reemplaza
 * al pasar el mouse) y las 4 zonas clickeables se trazan a mano sobre la
 * imagen base — libres, no un layout fijo, porque el menú puede tener
 * cualquier forma (no necesariamente un círculo con 4 cuartos iguales). */
export const ActionMenuSettingsSchema = z.object({
  /** Rutas relativas dentro de assets/games/<gameId>/action-menu/, o null =
   * todavía no configurada. Sin `normalImagePath` el menú no se muestra —
   * el objeto corre `onInteract` directo, como si `actionMenuEnabled`
   * fuera false. */
  normalImagePath: z.string().nullable().default(null),
  examineImagePath: z.string().nullable().default(null),
  interactImagePath: z.string().nullable().default(null),
  interactWithImagePath: z.string().nullable().default(null),
  closeImagePath: z.string().nullable().default(null),
  /** Vértices en % de la imagen base (no del stage), en orden — vacío =
   * esa acción todavía no tiene zona marcada. */
  examineZone: z.array(PolygonPointSchema).default([]),
  interactZone: z.array(PolygonPointSchema).default([]),
  interactWithZone: z.array(PolygonPointSchema).default([]),
  closeZone: z.array(PolygonPointSchema).default([]),
});

const DEFAULT_ACTION_MENU_SETTINGS = {
  normalImagePath: null,
  examineImagePath: null,
  interactImagePath: null,
  interactWithImagePath: null,
  closeImagePath: null,
  examineZone: [],
  interactZone: [],
  interactWithZone: [],
  closeZone: [],
};

/** Ajustes generales del sitio/juego. */
export const SiteSettingsSchema = z.object({
  /** Tipografía por defecto del tooltip de hotspot. */
  hotspotLabelStyle: TextStyleSchema.default({ fontFamily: 'sans', fontSize: 10, color: '#e6eaef' }),
  cursor: CursorSettingsSchema.default({ defaultCursorPath: null, hoverCursorPath: null }),
  actionMenu: ActionMenuSettingsSchema.default(DEFAULT_ACTION_MENU_SETTINGS),
});

export const AdventureCaseBundleSchema = z.object({
  case: AdventureCaseMetaSchema,
  scenes: z.array(SceneSchema),
  dialogues: z.record(z.string(), DialogueNodeSchema),
  investigationAreas: z.array(InvestigationAreaSchema),
  mirrorHints: z.array(MirrorHintSchema),
  agents: z.array(AgentDefSchema),
  equipmentItems: z.array(EquipmentItemSchema),
  /** Diccionario clave → texto en español. Ver docs sobre i18n en el editor. */
  strings: z.record(z.string(), z.string()),
  characters: z.array(CharacterSchema),
  siteSettings: SiteSettingsSchema.default({
    hotspotLabelStyle: { fontFamily: 'sans', fontSize: 10, color: '#e6eaef' },
    cursor: { defaultCursorPath: null, hoverCursorPath: null },
    actionMenu: DEFAULT_ACTION_MENU_SETTINGS,
  }),
});

export type SceneLayer = z.infer<typeof SceneLayerSchema>;
export type InterfaceId = z.infer<typeof InterfaceIdSchema>;
export type SceneAction = z.infer<typeof SceneActionSchema>;
export type MinigameOutcomeAction = z.infer<typeof MinigameOutcomeActionSchema>;
export type MinigameTemplate = z.infer<typeof MinigameTemplateSchema>;
export type Hotspot = z.infer<typeof HotspotSchema>;
export type Condition = z.infer<typeof ConditionSchema>;
export type Clue = z.infer<typeof ClueSchema>;
export type Deduction = z.infer<typeof DeductionSchema>;
export type Investigation = z.infer<typeof InvestigationSchema>;
export type Comparison = z.infer<typeof ComparisonSchema>;
export type InteractWithTarget = z.infer<typeof InteractWithTargetSchema>;
export type HotspotShape = z.infer<typeof HotspotShapeSchema>;
export type PolygonPoint = z.infer<typeof PolygonPointSchema>;
export type TextStyle = z.infer<typeof TextStyleSchema>;
export type TextStyleOverride = z.infer<typeof TextStyleOverrideSchema>;
export type SiteSettings = z.infer<typeof SiteSettingsSchema>;
export type CursorSettings = z.infer<typeof CursorSettingsSchema>;
export type ActionMenuSettings = z.infer<typeof ActionMenuSettingsSchema>;
export type SceneBackground = z.infer<typeof SceneBackgroundSchema>;
export type SceneKind = z.infer<typeof SceneKindSchema>;
export type CinematicTransition = z.infer<typeof CinematicTransitionSchema>;
export type MenuButton = z.infer<typeof MenuButtonSchema>;
export type MenuPosition = z.infer<typeof MenuPositionSchema>;
export type MenuButtonStyle = z.infer<typeof MenuButtonStyleSchema>;
export type FontFamily = z.infer<typeof FontFamilySchema>;
export type MenuAppearance = z.infer<typeof MenuAppearanceSchema>;
export type MenuTitle = z.infer<typeof MenuTitleSchema>;
export type Character = z.infer<typeof CharacterSchema>;
export type CharacterExpression = z.infer<typeof CharacterExpressionSchema>;
export type CharacterVariant = z.infer<typeof CharacterVariantSchema>;
export type DialogueChoice = z.infer<typeof DialogueChoiceSchema>;
export type DialogueNode = z.infer<typeof DialogueNodeSchema>;
export type Scene = z.infer<typeof SceneSchema>;
export type AdventureCaseMeta = z.infer<typeof AdventureCaseMetaSchema>;
export type InvestigationArea = z.infer<typeof InvestigationAreaSchema>;
export type MirrorHint = z.infer<typeof MirrorHintSchema>;
export type AgentDef = z.infer<typeof AgentDefSchema>;
export type EquipmentItem = z.infer<typeof EquipmentItemSchema>;
export type AdventureCaseBundle = z.infer<typeof AdventureCaseBundleSchema>;
export type LocaleStrings = z.infer<typeof AdventureCaseBundleSchema>['strings'];
