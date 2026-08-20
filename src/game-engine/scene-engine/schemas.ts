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
});

export const InterfaceIdSchema = z.enum(['mirror-investigation', 'agent-market', 'equipment-shop']);

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
  z.object({
    type: z.literal('transitionTo'),
    sceneId: z.string(),
    fade: z.enum(['cut', 'fade', 'fadeToBlack']).default('fade'),
  }),
  z.object({ type: z.literal('openInterface'), interfaceId: InterfaceIdSchema }),
  z.object({ type: z.literal('addMoney'), amount: z.number() }),
  /** Alterna el fondo activo de la escena actual entre dos backgrounds
   * (por id) — p. ej. una lámpara que muestra "luz encendida"/"luz
   * apagada". Si ninguno de los dos está activo todavía (fondo por
   * defecto = backgrounds[0]), el primer click pasa al que no sea el
   * default. */
  z.object({ type: z.literal('toggleBackground'), backgroundIdA: z.string(), backgroundIdB: z.string() }),
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
   * al mouse durante la partida — p. ej. un objeto decorativo marcado. */
  interactable: z.boolean().default(true),
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
});

export const SceneKindSchema = z.enum(['standard', 'intro', 'menu']);

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

export const SceneSchema = z.object({
  id: z.string(),
  act: z.number(),
  /** "intro" es una escena especial de solo fondos (logos, splash) que pasa
   * de uno a otro por tiempo y termina disparando `onIntroComplete` — sin
   * capas, hotspots ni diálogo. "menu" es un fondo con botones (título,
   * menú de inicio). Cualquier otra escena es "standard" (point-and-click). */
  kind: SceneKindSchema.default('standard'),
  /** Una escena puede tener varios fondos (luz prendida/apagada, flashes de
   * relámpago, etc.) — el primero de la lista es el que se ve por defecto.
   * Vincular qué objeto/estado cambia a cuál fondo se hace más adelante. */
  backgrounds: z.array(SceneBackgroundSchema),
  layers: z.array(SceneLayerSchema),
  hotspots: z.array(HotspotSchema),
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
  /** Solo `kind: "intro"`: si se puede saltar la secuencia con un botón
   * "Comenzar" en vez de esperar a que termine sola. */
  introSkippable: z.boolean().default(true),
  /** Solo `kind: "intro"`: acciones al terminar la secuencia (por tiempo) o
   * al saltarla con el botón — típicamente un `transitionTo` al menú. */
  onIntroComplete: z.array(SceneActionSchema).optional(),
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
});

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
export type MenuButton = z.infer<typeof MenuButtonSchema>;
export type MenuPosition = z.infer<typeof MenuPositionSchema>;
export type MenuButtonStyle = z.infer<typeof MenuButtonStyleSchema>;
export type FontFamily = z.infer<typeof FontFamilySchema>;
export type MenuAppearance = z.infer<typeof MenuAppearanceSchema>;
export type MenuTitle = z.infer<typeof MenuTitleSchema>;
export type Character = z.infer<typeof CharacterSchema>;
export type CharacterExpression = z.infer<typeof CharacterExpressionSchema>;
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
