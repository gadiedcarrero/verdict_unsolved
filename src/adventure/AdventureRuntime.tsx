import { useEffect, type JSX } from 'react';
import { activeAdventureCaseResult } from '../game-engine/scene-engine/activeAdventureCase';
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

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (isLoaded && activeAdventureCaseResult.ok && !bundle) {
      init(activeAdventureCaseResult.data, persistedAdventureState);
    }
  }, [isLoaded, bundle, init, persistedAdventureState]);

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

  const scene = getActiveScene();
  const activeNode = getActiveNode();
  // El teléfono muestra la pantalla de llamada entrante mientras suena, en
  // vez de una capa fija — ver docs/case-001-la-ultima-llamada/01-mapeo-escenas.md.
  const layerOverrides =
    ringState === 'ringing' && currentSceneId === 'oficina-acto1'
      ? { telefono: 'layers/telefono-llamada-entrante.png' }
      : undefined;

  if (!scene) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-graphite-950 text-graphite-200">
        Escena &quot;{currentSceneId}&quot; no encontrada.
      </div>
    );
  }

  return (
    <div className="relative h-screen w-screen bg-graphite-950">
      <button
        type="button"
        onClick={onExit}
        className="absolute top-4 right-4 z-10 rounded border border-graphite-700 px-3 py-1 text-[11px] tracking-widest text-graphite-400 uppercase transition-colors hover:border-amber-accent hover:text-amber-accent"
      >
        Salir
      </button>
      <SceneViewer
        scene={scene}
        transitioning={transitioning}
        layerOverrides={layerOverrides}
        onInteract={interactHotspot}
      >
        {activeInterfaceId ? (
          <InterfaceHost interfaceId={activeInterfaceId} />
        ) : (
          activeNode && <DialogueOverlay node={activeNode} onAdvance={advance} onChoose={selectChoice} />
        )}
      </SceneViewer>
    </div>
  );
}
