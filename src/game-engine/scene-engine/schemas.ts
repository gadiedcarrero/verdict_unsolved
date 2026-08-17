import { z } from 'zod';

/**
 * Motor de datos para casos tipo "aventura por capas" (Caso 001 "La última
 * llamada" en adelante), paralelo al motor de `case-loader` usado por
 * "Four Minutes". Ver docs/case-001-la-ultima-llamada/01-mapeo-escenas.md.
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
  label: z.string(),
  area: z.object({
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
  }),
  onInteract: z.array(SceneActionSchema),
  repeatable: z.boolean().default(true),
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

export const SceneSchema = z.object({
  id: z.string(),
  act: z.number(),
  background: z.string(),
  layers: z.array(SceneLayerSchema),
  hotspots: z.array(HotspotSchema),
  /** Acciones que corren automáticamente al entrar a la escena (p. ej. abrir un diálogo). */
  onEnter: z.array(SceneActionSchema).optional(),
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
});

export type SceneLayer = z.infer<typeof SceneLayerSchema>;
export type InterfaceId = z.infer<typeof InterfaceIdSchema>;
export type SceneAction = z.infer<typeof SceneActionSchema>;
export type Hotspot = z.infer<typeof HotspotSchema>;
export type DialogueChoice = z.infer<typeof DialogueChoiceSchema>;
export type DialogueNode = z.infer<typeof DialogueNodeSchema>;
export type Scene = z.infer<typeof SceneSchema>;
export type AdventureCaseMeta = z.infer<typeof AdventureCaseMetaSchema>;
export type InvestigationArea = z.infer<typeof InvestigationAreaSchema>;
export type MirrorHint = z.infer<typeof MirrorHintSchema>;
export type AgentDef = z.infer<typeof AgentDefSchema>;
export type EquipmentItem = z.infer<typeof EquipmentItemSchema>;
export type AdventureCaseBundle = z.infer<typeof AdventureCaseBundleSchema>;
