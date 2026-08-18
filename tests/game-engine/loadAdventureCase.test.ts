import { describe, expect, it } from 'vitest';
import { gameBundleRaw as adventureCaseBundleRaw } from '@/games/verdict-unsolved';
import { loadAdventureCase } from '@/game-engine/scene-engine/loadAdventureCase';

describe('loadAdventureCase', () => {
  it('loads the "La última llamada" bundle successfully', () => {
    const result = loadAdventureCase(adventureCaseBundleRaw);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.case.id).toBe('case-001-la-ultima-llamada');
      expect(Object.keys(result.data.dialogues).length).toBeGreaterThan(0);
      expect(result.data.agents.length).toBe(3);
      expect(result.data.equipmentItems.length).toBeGreaterThan(0);
      expect(result.data.investigationAreas.length).toBeGreaterThan(0);
    }
  });

  it('fails with a readable error when the case is missing required fields', () => {
    const corrupted = { case: { id: 'broken-case' }, scenes: [], dialogues: {} };

    const result = loadAdventureCase(corrupted);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.length).toBeGreaterThan(0);
    }
  });

  it('has no dangling dialogue references (every next/nodeId points to a real node)', () => {
    const result = loadAdventureCase(adventureCaseBundleRaw);
    if (!result.ok) throw new Error(result.error);
    const { scenes, dialogues } = result.data;

    const referencedIds = new Set<string>();
    for (const node of Object.values(dialogues)) {
      if (node.next) referencedIds.add(node.next);
      for (const choice of node.choices ?? []) referencedIds.add(choice.next);
      for (const action of node.onShow ?? []) {
        if (action.type === 'dialogue') referencedIds.add(action.nodeId);
      }
    }
    for (const scene of scenes) {
      for (const hotspot of scene.hotspots) {
        for (const action of hotspot.onInteract) {
          if (action.type === 'dialogue') referencedIds.add(action.nodeId);
        }
      }
      for (const action of scene.onEnter ?? []) {
        if (action.type === 'dialogue') referencedIds.add(action.nodeId);
      }
    }

    const missing = [...referencedIds].filter((id) => !(id in dialogues));
    expect(missing).toEqual([]);
  });

  it('has no dangling scene transitions (every transitionTo points to a real scene)', () => {
    const result = loadAdventureCase(adventureCaseBundleRaw);
    if (!result.ok) throw new Error(result.error);
    const { scenes, dialogues } = result.data;

    const sceneIds = new Set(scenes.map((s) => s.id));

    // Solo cuentan las transiciones de diálogos a los que en verdad se
    // puede llegar desde una escena (hotspot.onInteract / scene.onEnter) —
    // contenido todavía no conectado a ninguna escena (p. ej. guiones
    // viejos mientras se reconstruye un acto) no debe bloquear este check.
    const reachableNodeIds = new Set<string>();
    const queue: string[] = [];
    for (const scene of scenes) {
      for (const hotspot of scene.hotspots) {
        for (const action of hotspot.onInteract) {
          if (action.type === 'dialogue') queue.push(action.nodeId);
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
      for (const hotspot of scene.hotspots) {
        for (const action of hotspot.onInteract) {
          if (action.type === 'transitionTo') referencedSceneIds.add(action.sceneId);
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

    const missing = [...referencedSceneIds].filter((id) => !sceneIds.has(id));
    expect(missing).toEqual([]);
  });
});
