import type { ParsedHotspot, ParsedImage, ParsedScene } from '@shared/parsed-scene';
import { slugify, uniqueId } from '../../adventure/editor/slug';
import { SceneSchema, type Clue, type Hotspot, type Scene, type SceneAction } from './schemas';

/**
 * Traduce lo que la IA sacó del guion (`ParsedScene`) a una escena real del
 * motor. Determinista: mismas entradas, misma escena — la IA ya hizo la parte
 * interpretativa, acá no se decide nada, se calcula.
 *
 * Todo texto que ve el jugador sale como clave de traducción, y los textos
 * literales se devuelven aparte en `strings` para fundirlos en locales/es.json
 * (ver `scene-editor:save`, que ya recibe escena + parche de strings).
 */

export type BuiltScene = {
  scene: Scene;
  /** Clave → texto en español, para fundir en el diccionario del juego. */
  strings: Record<string, string>;
};

/** Las zonas salen en una grilla, no donde van. Nadie —ni una IA ni yo—
 * puede saber dónde está el cajón en una imagen que todavía no se generó; el
 * layout real lo ajusta el humano arrastrando, que es el paso que el pipeline
 * siempre reservó para él. Esto solo garantiza que arranquen visibles, sin
 * pisarse y en el orden en que el guion las nombra. */
const COLUMNS = 3;
const ZONE_WIDTH = 22;
const ZONE_HEIGHT = 14;
const MARGIN_X = 6;
const MARGIN_Y = 12;
const GAP_X = 6;
const GAP_Y = 8;

function placeholderArea(index: number): { x: number; y: number; width: number; height: number } {
  const column = index % COLUMNS;
  const row = Math.floor(index / COLUMNS);
  return {
    x: MARGIN_X + column * (ZONE_WIDTH + GAP_X),
    y: MARGIN_Y + row * (ZONE_HEIGHT + GAP_Y),
    width: ZONE_WIDTH,
    height: ZONE_HEIGHT,
  };
}

function backgroundIdFor(index: number): string {
  return `bg-${index + 1}`;
}

export function buildSceneFromScript(parsed: ParsedScene, sceneId: string, act = 1): BuiltScene {
  const strings: Record<string, string> = {};
  const clues: Clue[] = [];
  const takenHotspotIds = new Set<string>();
  const takenClueIds = new Set<string>();

  // Título de imagen → id de fondo, para resolver las navegaciones a primeros
  // planos. Se arma antes de recorrer las zonas porque una zona puede llevar a
  // una imagen que aparece más adelante en el guion.
  const backgroundIdByTitle = new Map<string, string>();
  parsed.images.forEach((image, index) => {
    backgroundIdByTitle.set(image.title.trim().toLowerCase(), backgroundIdFor(index));
  });

  function resolveImage(title: string | undefined): string | null {
    if (!title) return null;
    return backgroundIdByTitle.get(title.trim().toLowerCase()) ?? null;
  }

  function buildHotspot(hotspot: ParsedHotspot, index: number): Hotspot {
    const id = uniqueId(slugify(hotspot.name), takenHotspotIds);
    takenHotspotIds.add(id);

    const labelKey = `hotspot.${sceneId}.${id}`;
    strings[labelKey] = hotspot.name;

    const onInteract: SceneAction[] = [];

    if (hotspot.kind === 'clue' && hotspot.clue) {
      const clueId = uniqueId(id, takenClueIds);
      takenClueIds.add(clueId);
      const clueKey = `clue.${sceneId}.${clueId}`;
      strings[clueKey] = hotspot.clue;
      clues.push({ id: clueId, text: clueKey, global: hotspot.globalClue ?? false });
      onInteract.push({ type: 'discoverClue', clueId });
    }

    if (hotspot.text) {
      const nodeId = `dialogue.${sceneId}.${id}.interact`;
      strings[`${nodeId}.line`] = hotspot.text;
      onInteract.push({ type: 'dialogue', nodeId });
    }

    // Un primer plano y un cambio de estado son la misma acción para el motor
    // (cambiar el fondo activo); lo que los separa en el guion es la
    // intención, no el mecanismo.
    const targetBackgroundId = resolveImage(hotspot.targetImage) ?? resolveImage(hotspot.becomesImage);
    if (targetBackgroundId) {
      onInteract.push({ type: 'setBackground', backgroundId: targetBackgroundId });
    }

    const built: Hotspot = {
      id,
      label: labelKey,
      area: placeholderArea(index),
      shape: 'rect',
      onInteract,
      repeatable: true,
      interactable: true,
      actionMenuEnabled: false,
      onExamine: [],
      interactWithTargets: [],
    };

    if (hotspot.requiredCapabilities?.length) {
      built.enabledWhen = {
        flags: [],
        notFlags: [],
        variables: {},
        characters: [],
        capabilities: hotspot.requiredCapabilities,
      };
      if (hotspot.blockedText) {
        const blockedKey = `hotspot.${sceneId}.${id}.blocked`;
        strings[blockedKey] = hotspot.blockedText;
        built.disabledMessage = blockedKey;
      }
    }

    return built;
  }

  function buildBackground(image: ParsedImage, index: number) {
    return {
      id: backgroundIdFor(index),
      title: image.title,
      assetPath: `backgrounds/${sceneId}-${index + 1}.png`,
      hotspots: image.hotspots.map((hotspot, hotspotIndex) => buildHotspot(hotspot, hotspotIndex)),
      layers: [],
      ...(image.description ? { generationPrompt: image.description } : {}),
    };
  }

  // Una escena sin imágenes igual necesita un fondo: si no, no hay dónde
  // pegar nada y el motor no la puede mostrar.
  const images: ParsedImage[] = parsed.images.length > 0 ? parsed.images : [{ title: parsed.title, hotspots: [] }];
  const backgrounds = images.map(buildBackground);

  const draft: Record<string, unknown> = { id: sceneId, act, kind: 'standard', backgrounds };

  if (parsed.characterId) draft['activeCharacterId'] = parsed.characterId;

  if (parsed.objective) {
    const objectiveKey = `objective.${sceneId}`;
    strings[objectiveKey] = parsed.objective;

    const investigation: Record<string, unknown> = {
      objective: objectiveKey,
      clues,
      // Solo se fija un mínimo si el guion pide menos pistas de las que la
      // escena ofrece; si coinciden, "todas" ya es el default.
      requiredClues: parsed.requiredClues && parsed.requiredClues !== clues.length ? parsed.requiredClues : 0,
      onSolved: [],
    };

    if (parsed.deduction && parsed.deduction.answers.length > 0) {
      const questionKey = `deduction.${sceneId}.question`;
      strings[questionKey] = parsed.deduction.question;

      const answers = parsed.deduction.answers.map((answer, index) => {
        const answerId = `r${index + 1}`;
        const answerKey = `deduction.${sceneId}.${answerId}`;
        strings[answerKey] = answer;
        return { id: answerId, text: answerKey };
      });

      // Un índice fuera de rango sería una escena imposible de resolver: se
      // cae a la primera respuesta, que el humano corrige al revisar.
      const correct = answers[parsed.deduction.correctIndex] ?? answers[0];
      investigation['deduction'] = {
        question: questionKey,
        answers,
        correctAnswerId: correct!.id,
        wrongMessage: 'deduction.wrong',
      };
    }

    draft['investigation'] = investigation;
  }

  // Pasa por el schema para que la escena salga con todos los defaults
  // aplicados: lo que se guarda tiene que ser indistinguible de una escena
  // hecha a mano en el editor.
  const scene = SceneSchema.parse(draft);

  // Las líneas de diálogo se generan acá porque dependen de los ids que se
  // acaban de calcular. Van en la escena (Scene.dialogueNodes), que es donde
  // el editor pone las suyas.
  for (const background of scene.backgrounds) {
    for (const hotspot of background.hotspots) {
      for (const action of hotspot.onInteract) {
        if (action.type !== 'dialogue') continue;
        scene.dialogueNodes[action.nodeId] = {
          id: action.nodeId,
          speaker: parsed.characterId ?? 'sistema',
          line: strings[`${action.nodeId}.line`] ?? '',
        };
        delete strings[`${action.nodeId}.line`];
      }
    }
  }

  return { scene, strings };
}
