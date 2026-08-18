import { z } from 'zod';

/**
 * Motor de datos para casos tipo "aventura por capas" (Caso 001 "La última
 * llamada" en adelante). Ver docs/verdict-unsolved/01-mapeo-escenas.md.
 */

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

export const SceneActionSchema = z.discriminatedUnion('type', [
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
]);

export const HotspotSchema = z.object({
  id: z.string(),
  /** Clave de traducción (ver locales/es.json del caso), no el texto en sí —
   * así el nombre que aparece al pasar el mouse puede traducirse a otros
   * idiomas más adelante sin tocar la escena. */
  label: z.string(),
  area: z.object({
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
  }),
  onInteract: z.array(SceneActionSchema),
  repeatable: z.boolean().default(true),
  /** Si es false, la zona existe (para referencia/edición) pero no responde
   * al mouse durante la partida — p. ej. un objeto decorativo marcado. */
  interactable: z.boolean().default(true),
});

export const CharacterSchema = z.object({
  id: z.string(),
  /** Clave de traducción del nombre mostrado (ver locales/es.json). */
  name: z.string(),
  /** Ruta a la miniatura del rostro dentro de assets/portraits, o null si no
   * tiene retrato (p. ej. "sistema" para texto de narrador/interfaz). */
  portrait: z.string().nullable(),
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
});

export const SceneKindSchema = z.enum(['standard', 'intro']);

export const SceneSchema = z.object({
  id: z.string(),
  act: z.number(),
  /** "intro" es una escena especial de solo fondos (logos, splash) que pasa
   * de uno a otro por tiempo y termina disparando `onIntroComplete` — sin
   * capas, hotspots ni diálogo. Cualquier otra escena es "standard". */
  kind: SceneKindSchema.default('standard'),
  /** Una escena puede tener varios fondos (luz prendida/apagada, flashes de
   * relámpago, etc.) — el primero de la lista es el que se ve por defecto.
   * Vincular qué objeto/estado cambia a cuál fondo se hace más adelante. */
  backgrounds: z.array(SceneBackgroundSchema),
  layers: z.array(SceneLayerSchema),
  hotspots: z.array(HotspotSchema),
  /** Acciones que corren automáticamente al entrar a la escena (p. ej. abrir un diálogo). */
  onEnter: z.array(SceneActionSchema).optional(),
  /** Solo `kind: "intro"`: si se puede saltar la secuencia con un botón
   * "Comenzar" en vez de esperar a que termine sola. */
  introSkippable: z.boolean().default(true),
  /** Solo `kind: "intro"`: acciones al terminar la secuencia (por tiempo) o
   * al saltarla con el botón — típicamente un `transitionTo` al menú. */
  onIntroComplete: z.array(SceneActionSchema).optional(),
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
});

export type SceneLayer = z.infer<typeof SceneLayerSchema>;
export type InterfaceId = z.infer<typeof InterfaceIdSchema>;
export type SceneAction = z.infer<typeof SceneActionSchema>;
export type Hotspot = z.infer<typeof HotspotSchema>;
export type SceneBackground = z.infer<typeof SceneBackgroundSchema>;
export type SceneKind = z.infer<typeof SceneKindSchema>;
export type Character = z.infer<typeof CharacterSchema>;
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
