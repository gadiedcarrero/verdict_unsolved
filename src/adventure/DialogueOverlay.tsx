import type { JSX } from 'react';
import type { DialogueNode } from '../game-engine/scene-engine/schemas';

const SPEAKER_LABELS: Record<string, string> = {
  DIRECTOR: 'DIRECTOR',
  MIRROR: 'MIRROR',
  LENA: 'LENA HART',
  SISTEMA: '',
};

export function DialogueOverlay({
  node,
  onAdvance,
  onChoose,
}: {
  node: DialogueNode;
  onAdvance: () => void;
  onChoose: (next: string, setState?: Record<string, unknown>, addFlag?: string) => void;
}): JSX.Element {
  const speakerLabel = SPEAKER_LABELS[node.speaker] ?? node.speaker;
  const choices = node.choices ?? [];
  const hasChoices = choices.length > 0;

  return (
    // z-[100]: por encima de los hotspots (zIndex 50) y de cualquier capa de
    // escena (zIndex 1-4), para que nunca quede tapado ni robado el clic.
    <div className="absolute inset-x-0 bottom-0 z-100 flex justify-center p-6">
      <div className="w-full max-w-2xl rounded border border-graphite-700 bg-graphite-900/95 p-5 shadow-2xl backdrop-blur">
        {node.terminalBlock && (
          <pre className="mb-3 overflow-x-auto rounded border border-graphite-700 bg-graphite-950 p-3 font-mono text-[11px] leading-relaxed text-amber-accent whitespace-pre-wrap">
            {node.terminalBlock}
          </pre>
        )}

        {node.line && (
          <p className="text-sm leading-relaxed text-graphite-100">
            {speakerLabel && (
              <span className="mr-2 text-xs font-semibold tracking-widest text-amber-accent-strong">
                {speakerLabel}:
              </span>
            )}
            {node.line}
          </p>
        )}

        {hasChoices ? (
          <div className="mt-4 flex flex-col gap-2">
            {choices.map((choice) => (
              <button
                key={choice.id}
                type="button"
                onClick={() => onChoose(choice.next, choice.setState, choice.addFlag)}
                className="rounded border border-graphite-700 px-3 py-2 text-left text-sm text-graphite-200 transition-colors hover:border-amber-accent hover:text-amber-accent-strong"
              >
                {choice.text}
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={onAdvance}
              className="rounded border border-amber-accent px-4 py-1.5 text-xs font-semibold tracking-widest text-amber-accent uppercase transition-colors hover:bg-amber-accent hover:text-graphite-950"
            >
              {node.next ? 'Continuar' : 'Cerrar'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
