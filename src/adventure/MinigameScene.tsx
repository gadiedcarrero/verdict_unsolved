import { useEffect, type JSX } from 'react';
import type { Scene } from '../game-engine/scene-engine/schemas';
import { useAdventureRuntimeStore } from './adventureRuntime.store';
import { MinigameHost } from './minigames/MinigameHost';

/**
 * Escena `kind: "minigame"`: pantalla completa, sin fondo ni zonas propias
 * — a diferencia del minijuego de zona (Hotspot.onInteract → openMinigame,
 * un overlay sobre una escena interactiva ya existente), esta escena ES el
 * minijuego. Pensada para el caso "una zona manda a resolver algo y hay que
 * decidir a dónde va según si lo logra o no": se llega acá con un
 * `transitionTo` normal (con o sin `backgroundId`) desde cualquier
 * interacción, y `onMinigameSuccess`/`onMinigameFail` son `SceneAction[]`
 * normales — típicamente otro `transitionTo` de vuelta, armado con el mismo
 * selector escena→fondo del compositor de acciones.
 */
export function MinigameScene({ scene }: { scene: Scene }): JSX.Element {
  const runActions = useAdventureRuntimeStore((s) => s.runActions);

  useEffect(() => {
    if (!scene.minigameTemplate) return;
    runActions([
      {
        type: 'openMinigame',
        template: scene.minigameTemplate,
        sequenceLength: scene.minigameSequenceLength,
        onSuccess: scene.onMinigameSuccess,
        onFail: scene.onMinigameFail,
      },
    ]);
  }, [
    scene.id,
    scene.minigameTemplate,
    scene.minigameSequenceLength,
    scene.onMinigameSuccess,
    scene.onMinigameFail,
    runActions,
  ]);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-graphite-950">
      {!scene.minigameTemplate && (
        <p className="text-xs tracking-widest text-graphite-600 uppercase">
          Sin plantilla de minijuego — elegí una en el editor
        </p>
      )}
      <MinigameHost />
    </div>
  );
}
