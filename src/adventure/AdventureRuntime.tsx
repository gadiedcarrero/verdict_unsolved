import { useEffect, useState, type JSX } from 'react';
import type { EditableRect } from './editor/EditableBox';
import { SceneEditorPanel } from './editor/SceneEditorPanel';
import { activeAdventureCaseResult } from '../game-engine/scene-engine/activeAdventureCase';
import type { Scene } from '../game-engine/scene-engine/schemas';
import { useSaveStore } from '../game-engine/save-system/save.store';
import { useAdventureRuntimeStore } from './adventureRuntime.store';
import { DialogueOverlay } from './DialogueOverlay';
import { InterfaceHost } from './interfaces/InterfaceHost';
import { SceneViewer } from './SceneViewer';

export function AdventureRuntime({ onExit }: { onExit: () => void }): JSX.Element {
  const load = useSaveStore((s) => s.load);
  const isLoaded = useSaveStore((s) => s.isLoaded);
  const persistedAdventureState = useSaveStore((s) => s.adventureCaseState);

  const init = useAdventureRuntimeStore((s) => s.init);
  const bundle = useAdventureRuntimeStore((s) => s.bundle);
  const currentSceneId = useAdventureRuntimeStore((s) => s.currentSceneId);
  // Se leen para forzar el re-render cuando cambian; el valor derivado se
  // recalcula abajo con getActiveScene()/getActiveNode().
  useAdventureRuntimeStore((s) => s.activeDialogueNodeId);
  const activeInterfaceId = useAdventureRuntimeStore((s) => s.activeInterfaceId);
  const transitioning = useAdventureRuntimeStore((s) => s.transitioning);
  const ringState = useAdventureRuntimeStore((s) => s.ringState);
  const interactHotspot = useAdventureRuntimeStore((s) => s.interactHotspot);
  const advance = useAdventureRuntimeStore((s) => s.advance);
  const selectChoice = useAdventureRuntimeStore((s) => s.selectChoice);
  const getActiveScene = useAdventureRuntimeStore((s) => s.getActiveScene);
  const getActiveNode = useAdventureRuntimeStore((s) => s.getActiveNode);

  // Modo edición: arrastrar/redimensionar capas y hotspots sobre la escena y
  // guardar las coordenadas directo en el JSON fuente (solo en `pnpm dev`).
  const [editMode, setEditMode] = useState(false);
  const [editedScene, setEditedScene] = useState<Scene | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (isLoaded && activeAdventureCaseResult.ok && !bundle) {
      init(activeAdventureCaseResult.data, persistedAdventureState);
    }
  }, [isLoaded, bundle, init, persistedAdventureState]);

  useEffect(() => {
    setEditedScene(null);
    setSaveMessage(null);
  }, [currentSceneId]);

  if (!activeAdventureCaseResult.ok) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-graphite-950 p-8 text-center text-graphite-200">
        <p>
          No se pudo cargar el caso.
          <br />
          <span className="text-sm text-graphite-400">{activeAdventureCaseResult.error}</span>
        </p>
      </div>
    );
  }

  if (!isLoaded || !bundle) {
    return <div className="h-screen w-screen bg-graphite-950" />;
  }

  const baseScene = getActiveScene();
  const activeNode = getActiveNode();
  const displayScene = editedScene ?? baseScene;
  // El teléfono muestra la pantalla de llamada entrante mientras suena, en
  // vez de una capa fija — ver docs/case-001-la-ultima-llamada/01-mapeo-escenas.md.
  const layerOverrides =
    ringState === 'ringing' && currentSceneId === 'oficina-acto1'
      ? { telefono: 'layers/telefono-llamada-entrante.png' }
      : undefined;

  if (!displayScene) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-graphite-950 text-graphite-200">
        Escena &quot;{currentSceneId}&quot; no encontrada.
      </div>
    );
  }

  function updateLayerRect(layerId: string, rect: EditableRect): void {
    setEditedScene((prev) => {
      const base = prev ?? baseScene;
      if (!base) return prev;
      return { ...base, layers: base.layers.map((layer) => (layer.id === layerId ? { ...layer, ...rect } : layer)) };
    });
  }

  function updateHotspotRect(hotspotId: string, rect: EditableRect): void {
    setEditedScene((prev) => {
      const base = prev ?? baseScene;
      if (!base) return prev;
      return {
        ...base,
        hotspots: base.hotspots.map((hotspot) => (hotspot.id === hotspotId ? { ...hotspot, area: rect } : hotspot)),
      };
    });
  }

  async function handleSave(): Promise<void> {
    if (!editedScene) return;
    setSaving(true);
    setSaveMessage(null);
    const payload = {
      id: editedScene.id,
      act: editedScene.act,
      background: editedScene.background,
      layers: editedScene.layers,
      hotspots: editedScene.hotspots,
      ...(editedScene.onEnter ? { onEnter: editedScene.onEnter } : {}),
    };
    const result = await window.api.saveSceneLayout(editedScene.id, payload);
    setSaving(false);
    setSaveMessage(result.ok ? 'Guardado en el JSON de la escena.' : `Error: ${result.error}`);
  }

  return (
    <div className="relative h-screen w-screen bg-graphite-950">
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        {import.meta.env.DEV && (
          <button
            type="button"
            onClick={() => setEditMode((v) => !v)}
            className={`rounded border px-3 py-1 text-[11px] tracking-widest uppercase transition-colors ${
              editMode
                ? 'border-amber-accent bg-amber-accent text-graphite-950'
                : 'border-graphite-700 text-graphite-400 hover:border-amber-accent hover:text-amber-accent'
            }`}
          >
            {editMode ? 'Salir de edición' : 'Editar posiciones'}
          </button>
        )}
        <button
          type="button"
          onClick={onExit}
          className="rounded border border-graphite-700 px-3 py-1 text-[11px] tracking-widest text-graphite-400 uppercase transition-colors hover:border-amber-accent hover:text-amber-accent"
        >
          Salir
        </button>
      </div>
      <SceneViewer
        scene={displayScene}
        transitioning={transitioning}
        layerOverrides={layerOverrides}
        onInteract={interactHotspot}
        editMode={editMode}
        onLayerRectChange={updateLayerRect}
        onHotspotRectChange={updateHotspotRect}
      >
        {editMode ? (
          <SceneEditorPanel
            scene={displayScene}
            onLayerRectChange={updateLayerRect}
            onHotspotRectChange={updateHotspotRect}
            onSave={() => void handleSave()}
            onDiscard={() => {
              setEditedScene(null);
              setSaveMessage(null);
            }}
            hasChanges={editedScene !== null}
            saving={saving}
            saveMessage={saveMessage}
          />
        ) : activeInterfaceId ? (
          <InterfaceHost interfaceId={activeInterfaceId} />
        ) : (
          activeNode && <DialogueOverlay node={activeNode} onAdvance={advance} onChoose={selectChoice} />
        )}
      </SceneViewer>
    </div>
  );
}
