import { describe, expect, it } from 'vitest';
import { gameProjects } from '@/game-engine/scene-engine/gameProjects';
import { loadAdventureCase } from '@/game-engine/scene-engine/loadAdventureCase';
import type { AdventureCaseBundle } from '@/game-engine/scene-engine/schemas';

/**
 * Chequeos de integridad sobre los juegos que haya en el repo, sean cuales
 * sean. Antes esto importaba un juego por nombre; ahora recorre
 * `gameProjects`, así sigue valiendo cuando se borra un juego o se empieza
 * otro — y un juego nuevo queda cubierto por el solo hecho de existir.
 *
 * Sin juegos, los checks no tienen nada que revisar y pasan: es lo correcto,
 * no hay contenido que pueda estar roto.
 */

function loadedBundles(): { id: string; bundle: AdventureCaseBundle }[] {
  return gameProjects.flatMap((project) => (project.result.ok ? [{ id: project.id, bundle: project.result.data }] : []));
}

describe('loadAdventureCase', () => {
  it('carga todos los juegos del repo', () => {
    for (const project of gameProjects) {
      expect(project.result.ok, `${project.id}: ${project.result.ok ? '' : project.result.error}`).toBe(true);
    }
  });

  it('falla con un error legible cuando al caso le faltan campos requeridos', () => {
    const corrupted = { case: { id: 'broken-case' }, scenes: [], dialogues: {} };

    const result = loadAdventureCase(corrupted);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.length).toBeGreaterThan(0);
  });

  it.each(loadedBundles())('$id: ningún diálogo apunta a un nodo que no existe', ({ bundle }) => {
    const { scenes, dialogues } = bundle;

    const referencedIds = new Set<string>();
    for (const node of Object.values(dialogues)) {
      if (node.next) referencedIds.add(node.next);
      for (const choice of node.choices ?? []) referencedIds.add(choice.next);
      for (const action of node.onShow ?? []) {
        if (action.type === 'dialogue') referencedIds.add(action.nodeId);
      }
    }
    for (const scene of scenes) {
      for (const background of scene.backgrounds) {
        for (const hotspot of background.hotspots) {
          for (const action of hotspot.onInteract) {
            if (action.type === 'dialogue') referencedIds.add(action.nodeId);
          }
        }
      }
      for (const action of scene.onEnter ?? []) {
        if (action.type === 'dialogue') referencedIds.add(action.nodeId);
      }
    }

    expect([...referencedIds].filter((id) => !(id in dialogues))).toEqual([]);
  });

  it.each(loadedBundles())('$id: ninguna transición apunta a una escena que no existe', ({ bundle }) => {
    const { scenes, dialogues } = bundle;
    const sceneIds = new Set(scenes.map((s) => s.id));

    // Solo cuentan las transiciones de diálogos a los que en verdad se
    // puede llegar desde una escena (hotspot.onInteract / scene.onEnter) —
    // contenido todavía no conectado a ninguna escena (p. ej. guiones
    // viejos mientras se reconstruye un acto) no debe bloquear este check.
    const reachableNodeIds = new Set<string>();
    const queue: string[] = [];
    for (const scene of scenes) {
      for (const background of scene.backgrounds) {
        for (const hotspot of background.hotspots) {
          for (const action of hotspot.onInteract) {
            if (action.type === 'dialogue') queue.push(action.nodeId);
          }
        }
      }
      for (const action of scene.onEnter ?? []) {
        if (action.type === 'dialogue') queue.push(action.nodeId);
      }
    }
    while (queue.length > 0) {
      const nodeId = queue.pop();
      if (!nodeId || reachableNodeIds.has(nodeId)) continue;
      reachableNodeIds.add(nodeId);
      const node = dialogues[nodeId];
      if (!node) continue;
      if (node.next) queue.push(node.next);
      for (const choice of node.choices ?? []) queue.push(choice.next);
      for (const action of node.onShow ?? []) {
        if (action.type === 'dialogue') queue.push(action.nodeId);
      }
    }

    const referencedSceneIds = new Set<string>();
    for (const nodeId of reachableNodeIds) {
      for (const action of dialogues[nodeId]?.onShow ?? []) {
        if (action.type === 'transitionTo') referencedSceneIds.add(action.sceneId);
      }
    }
    for (const scene of scenes) {
      for (const background of scene.backgrounds) {
        for (const hotspot of background.hotspots) {
          for (const action of hotspot.onInteract) {
            if (action.type === 'transitionTo') referencedSceneIds.add(action.sceneId);
          }
        }
      }
      for (const action of scene.onEnter ?? []) {
        if (action.type === 'transitionTo') referencedSceneIds.add(action.sceneId);
      }
      for (const action of scene.onIntroComplete ?? []) {
        if (action.type === 'transitionTo') referencedSceneIds.add(action.sceneId);
      }
      for (const button of scene.menuButtons) {
        for (const action of button.onClick) {
          if (action.type === 'transitionTo') referencedSceneIds.add(action.sceneId);
        }
      }
    }

    expect([...referencedSceneIds].filter((id) => !sceneIds.has(id))).toEqual([]);
  });
});
