import type { JSX } from 'react';
import { useAdventureRuntimeStore } from '../adventureRuntime.store';
import { InterfaceShell } from '../interfaces/InterfaceShell';
import { SequenceMinigame } from './SequenceMinigame';

/**
 * Muestra el minijuego activo (ver `activeMinigame` en el store) dentro del
 * mismo shell visual que las demás interfaces de pantalla completa —
 * self-contenido a propósito (lee del store directo, sin props) para no
 * tener que hacer pasar `activeMinigame` por SceneViewer. Cada plantilla
 * nueva solo agrega un `case` acá.
 */
export function MinigameHost(): JSX.Element | null {
  const activeMinigame = useAdventureRuntimeStore((s) => s.activeMinigame);
  const completeMinigame = useAdventureRuntimeStore((s) => s.completeMinigame);

  if (!activeMinigame) return null;

  return (
    <InterfaceShell title="Minijuego" onClose={() => completeMinigame(false)}>
      {activeMinigame.template === 'sequence' && (
        <SequenceMinigame sequenceLength={activeMinigame.sequenceLength} onComplete={completeMinigame} />
      )}
    </InterfaceShell>
  );
}
