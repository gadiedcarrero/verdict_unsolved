import { useState, type JSX } from 'react';
import type { Character, DialogueNode } from '../game-engine/scene-engine/schemas';
import { gameAssetUrl } from './gameAssetUrl';
import { translate } from '../i18n/translate';

function CharacterPortrait({
  gameId,
  portrait,
  color,
}: {
  gameId: string;
  portrait: string;
  color: string;
}): JSX.Element {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-dashed bg-graphite-800/70 px-1 text-center text-[7px] break-all text-graphite-400"
        style={{ borderColor: color }}
      >
        {portrait}
      </div>
    );
  }

  return (
    <img
      src={gameAssetUrl(gameId, portrait)}
      alt=""
      onError={() => setFailed(true)}
      className="h-14 w-14 shrink-0 rounded-full border-2 object-cover"
      style={{ borderColor: color }}
    />
  );
}

export function DialogueOverlay({
  gameId,
  node,
  characters,
  strings,
  onAdvance,
  onChoose,
}: {
  gameId: string;
  node: DialogueNode;
  characters: Character[];
  strings: Record<string, string>;
  onAdvance: () => void;
  onChoose: (next: string, setState?: Record<string, unknown>, addFlag?: string) => void;
}): JSX.Element {
  const character = characters.find((c) => c.id === node.speaker);
  const speakerLabel = character ? translate(strings, character.name) : node.speaker;
  const speakerColor = character?.color;
  const choices = node.choices ?? [];
  const hasChoices = choices.length > 0;

  return (
    // z-[100]: por encima de los hotspots (zIndex 50) y de cualquier capa de
    // escena (zIndex 1-4), para que nunca quede tapado ni robado el clic.
    <div className="absolute inset-x-0 bottom-0 z-100 flex justify-center p-6">
      <div className="flex w-full max-w-2xl gap-3 rounded border border-graphite-700 bg-graphite-900/95 p-5 shadow-2xl backdrop-blur">
        {character?.portrait && (
          <CharacterPortrait gameId={gameId} portrait={character.portrait} color={character.color} />
        )}

        <div className="min-w-0 flex-1">
          {node.terminalBlock && (
            <pre className="mb-3 overflow-x-auto rounded border border-graphite-700 bg-graphite-950 p-3 font-mono text-[11px] leading-relaxed text-amber-accent whitespace-pre-wrap">
              {node.terminalBlock}
            </pre>
          )}

          {node.line && (
            <p className="text-sm leading-relaxed text-graphite-100">
              {speakerLabel && (
                <span className="mr-2 text-xs font-semibold tracking-widest" style={{ color: speakerColor }}>
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
    </div>
  );
}
