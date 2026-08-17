# Mapeo técnico — Caso 001: "La última llamada" sobre la arquitectura Electron/React existente

Este documento traduce el guion (`00-guion-original.md`) a piezas de motor concretas, reutilizando lo que ya existe en el proyecto y señalando qué falta construir. No es código todavía — es el plano antes de tocar `src/`.

---

## 1. Qué reutilizamos tal cual

El motor actual (`game-engine/`, `applications/`, `desktop/`) fue construido para el caso "Four Minutes": investigar **desde una computadora** (evidencia, mensajes, timeline, conclusiones por requisitos). Varias piezas sirven sin cambios:

| Pieza existente | Para qué la reusamos en "La última llamada" |
|---|---|
| `game-engine/save-system` (zustand + `window.api.saveGame/loadGame`) | Guardado continuo irreversible — es literalmente lo que pide la Escena 2 ("LAS DECISIONES NO PUEDEN DESHACERSE"). Solo hay que ampliar la forma de `SaveData`. |
| `game-engine/case-loader` (patrón schema Zod + `CaseBundle` + `CaseProvider`/`useCaseBundle`) | El patrón "JSON validado con Zod + Context de React" se reutiliza para el nuevo tipo de contenido (ver sección 3). No el `CaseSchema` en sí, que es específico de Four Minutes. |
| Patrón de `applications/*App.tsx` (panel lateral + detalle, Tailwind, `useCaseBundle`) | Sirve de plantilla para las interfaces tipo pantalla dentro de la oficina: MIRROR, mercado de agentes, tienda/loadout, registro de evidencias (JANUS, fotografía, mensaje de Daniel). |
| `electron/` + `electron-builder.yml` | Empaquetado para Steam ya resuelto, sin cambios. |

## 2. Qué es nuevo (no existe hoy en el código)

"Four Minutes" nunca sale de una pantalla de computadora. "La última llamada" es, en cambio, una **aventura gráfica por capas**: escenas ilustradas con hotspots, zoom a objetos, personajes con retratos y expresiones, diálogo ramificado, y un modo de control directo (Wraith) en primera persona. Eso exige subsistemas nuevos:

1. **SceneViewer** — renderiza una escena por capas (fondo + capas de objetos posicionadas) con hotspots clicables, zoom/parallax y fundidos entre escenas.
2. **DialogueTree** — diálogo con líneas por personaje, retrato + expresión, y opciones que ramifican y pueden mutar estado.
3. **CaseStateMachine** — las 12 variables persistentes del guion (`SelectedAgent`, `AgentTrust`, `AlarmLevel`, etc.), independientes del `SaveData` global de dinero/reputación.
4. **AgentMarket** — mercado de contratación (Ghost/Patch/Rook), con stats y confianza inicial.
5. **Loadout/Shop** — tienda de equipo + asignación a un agente + riesgo de pérdida.
6. **MirrorHints** — sistema de pistas en 4 niveles (Resumen/Orientación/Pista fuerte/Solución) por acertijo, manual, sin IA generativa.
7. **EYE Minigame** — las 4 fases (Detectar/Enrutar/Sincronizar/Elegir intervención), reutilizable en el recuerdo de The Annex (Escena 7, sin consecuencia) y en las cámaras reales (Escenas 8 y 9, con consecuencia).
8. **WraithMode** — variante del SceneViewer en primera persona, con la particularidad narrativa de que la "voz del Director" en el auricular es en realidad MIRROR retransmitiendo (esto es puesta en escena/audio, no requiere lógica especial más allá de qué línea de diálogo se muestra).

Prioridad para el vertical slice, de mayor a menor apalancamiento: **SceneViewer → DialogueTree → CaseStateMachine → MirrorHints → AgentMarket/Loadout → EYE Minigame → WraithMode**. Los primeros tres son la base sin la cual no se puede jugar ni una sola escena; los últimos son específicos de un acto cada uno.

---

## 3. Modelo de datos propuesto (borrador, no implementado aún)

Nuevo tipo de contenido paralelo a `CaseBundle`, por ejemplo `AdventureCaseBundle`, con su propio `schemas.ts` dentro de `src/cases/case-001-la-ultima-llamada/`:

```ts
type SceneLayer = {
  id: string;
  assetPath: string;        // placeholder o arte final, mismo nombre de archivo
  x: number; y: number;     // posición dentro del lienzo de escena
  zIndex: number;
};

type Hotspot = {
  id: string;
  label: string;            // para accesibilidad / debug, no visible al jugador
  area: { x: number; y: number; width: number; height: number };
  onInteract: SceneAction[]; // secuencia de acciones (diálogo, cambio de estado, zoom, transición)
  condition?: StateCondition;      // ej: solo visible si AlarmLevel < 2
  repeatable: boolean;
};

type SceneAction =
  | { type: 'dialogue'; nodeId: string }
  | { type: 'zoom'; targetLayerId: string }
  | { type: 'setState'; key: keyof CaseState; value: unknown }
  | { type: 'transitionTo'; sceneId: string; fade: 'cut' | 'fade' | 'fadeToBlack' }
  | { type: 'openInterface'; interfaceId: 'zeroNetwork' | 'mirror' | 'market' | 'shop' | 'eye' };

type DialogueNode = {
  id: string;
  speaker: string;           // 'DIRECTOR' | 'LENA' | 'MIRROR' | ...
  portraitExpression?: string;
  line: string;
  choices?: DialogueChoice[];
  next?: string;             // si no hay choices, avanza automático
};

type DialogueChoice = {
  id: string;
  text: string;
  next: string;              // siguiente nodo
  setState?: Partial<CaseState>;
};

type Scene = {
  id: string;                // ej: 'oficina-acto1', 'halcyon-exterior'
  act: number;
  background: string;
  layers: SceneLayer[];
  hotspots: Hotspot[];
};
```

`CaseState` (la máquina de estado del caso, separada del `SaveData` global de dinero/reputación):

```ts
type CaseState = {
  selectedAgent: 'ghost' | 'patch' | 'rook' | null;
  agentTrust: number;
  agentInjured: boolean;
  agentAlive: boolean;
  danielAlive: boolean;
  janusRecovered: boolean;
  clientTruthDiscovered: boolean;
  alarmLevel: number;
  equipmentLost: string[];
  wraithIdentitySuspicion: number;
  mirrorHintsUsed: number;
  casePayment: number;
};
```

Esto se persiste dentro del `SaveData` compartido (extendiendo `shared/save-data.ts` con un bloque `caseState` por caso activo), no reemplaza el sistema de guardado actual.

---

## 4. Mapeo escena por escena

Convención: **[R]** = sistema reutilizado sin cambios, **[N]** = sistema nuevo de la sección 2.

### ACTO I — La oficina

| Escena | Fondo / capas | Interacción | Estado que cambia | Sistemas |
|---|---|---|---|---|
| **1. Antes de la llamada** | Oficina principal (1 fondo maestro, 9 capas: teléfono, PC, lámpara/cenicero/café, foto, sobre, archivadores, tablero, puerta, ventanas + rueda parcial) | Hotspots: fotografía (zoom + diálogo), sobre (diálogo), cajón (bloqueado, diálogo corto), computadora (abre interfaz ZERO NETWORK/MIRROR), teléfono (diálogo antes de sonar) | Ninguno persistente todavía; el registro de la fotografía en MIRROR es un flag local `photoLogged` | SceneViewer [N], DialogueTree [N], interfaz ZERO NETWORK/MIRROR [N, plantilla de `applications/`] |
| **2. La última llamada** | Mismo fondo de oficina, overlay de llamada (retrato de Lena en audio, sin video) + zoom final a la rueda | Árbol de diálogo con Lena, decisión aceptar/rechazar | `casePayment` adelanto = $300 si acepta; guardado irreversible se activa aquí | DialogueTree [N], CaseStateMachine [N], save-system [R, extendido] |

### ACTO II — Investigar antes de arriesgar

| Escena | Fondo / capas | Interacción | Estado | Sistemas |
|---|---|---|---|---|
| **3. Verificar al cliente** | Interfaz MIRROR (4 paneles: perfil Lena, mensaje Daniel, registros Halcyon, base Acheron) | Buscar contradicción; pedir pistas a MIRROR (4 niveles) | `clientTruthDiscovered = true` si se encuentra antes de contratar | Reusa patrón `EvidenceApp`/`MessagesApp` [R, adaptado], MirrorHints [N] |
| **4. Contratar agente** | Mercado clandestino: 3 retratos + expediente (Ghost/Patch/Rook) | Ver stats, entrevistar (diálogo corto opcional), contratar | `selectedAgent`, `agentTrust` inicial, resta de `money` (store existente) | AgentMarket [N], save-system money [R] |
| **5. Equipamiento** | Tienda: tabla de 6 ítems con precio/función/riesgo | Seleccionar loadout dentro del presupuesto restante | `money` resta, loadout asignado al agente (para cálculo posterior de `equipmentLost`) | Loadout/Shop [N] |

### ACTO III — La lección de las cámaras

| Escena | Fondo / capas | Interacción | Estado | Sistemas |
|---|---|---|---|---|
| **6. Llegada al Halcyon** | Exterior del edificio bajo lluvia | Mensaje de texto/foto del agente, abre módulo EYE | — | SceneViewer [N] |
| **7. Recuerdo: The Annex** | Pasillo + terminal de vigilancia (2 fondos), viñeta de Adrian joven | Diálogo con Voss (4 opciones, no bloqueantes) + tutorial EYE fases 1-4 sin consecuencia | flag local `eyeTutorialDone` | DialogueTree [N], EYE Minigame [N, modo tutorial] |
| **8. Primera cámara real** | Halcyon exterior (repetido) | EYE real con medidor de detección, sin riesgo de muerte | — | EYE Minigame [N, modo real] |

### ACTO IV — Lo que Lena ocultó

| Escena | Fondo / capas | Interacción | Estado | Sistemas |
|---|---|---|---|---|
| **9. Cámara fuera de planos** | Halcyon pasillo interior | 4 opciones según agente/equipo (esconder+hackear, inyector de red, apagar circuito, cruzar) | `alarmLevel` sube según elección; puede disparar patrulla anticipada | Hotspot condicional [N], CaseStateMachine [N] |
| **10. Despacho 2B** | Despacho (JANUS, sangre, teléfono roto, foto antigua, Daniel herido) | Diálogo con Daniel (colapsa a los segundos); decisión irreversible principal (5 opciones, la 5ª activa Wraith) | `danielAlive`, `janusRecovered` (parcial), posible activación de Wraith | DialogueTree [N], CaseStateMachine [N] |

### ACTO V — Wraith

| Escena | Fondo / capas | Interacción | Estado | Sistemas |
|---|---|---|---|---|
| **11. Activación** | Expediente sin foto "AGENTE: WRAITH"; fundido a negro; escenarios estáticos en primera persona | Diálogo Director/MIRROR (voz retransmitida); jugador controla Wraith: accesos, equipo, rutas, sistemas | `wraithIdentitySuspicion` aumenta ligeramente por el propio hecho de usarlo | WraithMode [N] (reusa SceneViewer + DialogueTree con set de fondos distinto) |
| **12. Extracción** | Túnel de servicio / Vestíbulo / Azotea / Separarse (4 variantes de fondo) | Repartir cargas (Daniel/JANUS/equipo), elegir ruta final | `agentInjured`, `agentAlive`, `danielAlive`, `janusRecovered`, `equipmentLost` se resuelven aquí definitivamente | CaseStateMachine [N], SceneViewer [N] |

### ACTO VI — Consecuencias

| Escena | Fondo / capas | Interacción | Estado | Sistemas |
|---|---|---|---|---|
| **13. Regreso a la oficina** | Oficina (mismo fondo del Acto I) | Informe de MIRROR; texto varía según combinación de variables (5 variantes descritas en el guion) | `casePayment` final, pago a Lena | Reporte condicional [N, similar a `ReportsApp`] |
| **14. La fotografía** | Zoom a la fotografía del Halcyon vs. la de la oficina | Diálogo Director/MIRROR, zoom a Evelyn | flag `photoComparisonSeen` | DialogueTree [N] |
| **15. Cierre secreto** | Panel "PROTOCOLO MIRROR" + viñeta final de Wraith bajo la lluvia | Sin input del jugador más que avanzar | — | SceneViewer [N] |

---

## 5. Manifiesto de assets

Ver `02-manifiesto-assets.md` — lista completa de fondos, retratos y audio con nombre de archivo, dimensiones sugeridas y estrategia de placeholder para poder jugar el flujo completo sin arte final.

## 6. Próximo paso propuesto

No se ha escrito código todavía. El siguiente paso natural, en orden, sería:

1. Crear `src/cases/case-001-la-ultima-llamada/` con los schemas Zod de la sección 3 (`Scene`, `DialogueNode`, `CaseState`) — extiende el patrón de `case-loader`, no lo reemplaza.
2. Construir el componente `SceneViewer` con capas + hotspots usando **placeholders** (rectángulos de color con la etiqueta del asset) según el manifiesto.
3. Construir `DialogueTree` (un componente + un store zustand simple) y cablear la Escena 1 y 2 completas como prueba de extremo a extremo (oficina → llamada → guardado irreversible).
4. Recién ahí seguir con Acto II en adelante.

Esto da un vertical-slice-del-vertical-slice jugable (Acto I) antes de invertir en los seis actos completos.
