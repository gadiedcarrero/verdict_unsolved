import { useState, type JSX } from 'react';
import type { Character, DialogueNode } from '../game-engine/scene-engine/schemas';
import { gameAssetUrl } from './gameAssetUrl';
import { translate } from '../i18n/translate';

/** El busto se dibuja sin recorte (pensado para arte 3/4 con fondo
 * transparente — ver memoria "busto 3/4") apoyado sobre un aro decorativo:
 * la cabeza/hombros sobresalen libremente por arriba del aro en vez de
 * quedar encerrados en un círculo chico, como en el diálogo de referencia
 * que pidió el usuario. Con fotos viejas sin fondo transparente se ve
 * simplemente como una imagen más grande — el efecto "profesional" depende
 * del arte, no solo del layout. */
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
        className="flex h-16 w-16 shrink-0 items-center justify-center self-end rounded-full border-2 border-dashed bg-graphite-800/70 px-1 text-center text-[7px] break-all text-graphite-400"
        style={{ borderColor: color }}
      >
        {portrait}
      </div>
    );
  }

  return (
    <div className="relative h-28 w-20 shrink-0 self-end">
      <div
        className="absolute inset-x-0 bottom-0 mx-auto h-16 w-16 rounded-full border-2"
        style={{ borderColor: color, backgroundColor: 'rgba(12,13,16,0.55)' }}
      />
      <img
        src={gameAssetUrl(gameId, portrait)}
        alt=""
        onError={() => setFailed(true)}
        className="absolute inset-x-0 bottom-0 mx-auto h-28 w-auto object-contain object-bottom drop-shadow-[0_4px_10px_rgba(0,0,0,0.55)]"
      />
    </div>
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
  // Si el nodo pide una expresión y el personaje tiene imagen cargada para
  // ella, se usa esa variante de retrato; si no (o si la expresión todavía
  // no tiene imagen generada — path null), el retrato por defecto (ver
  // Character.expressions / ActionComposer "Expresión del retrato").
  const portrait = node.portraitExpression
    ? (character?.expressions[node.portraitExpression]?.path ?? character?.portrait)
    : character?.portrait;

  return (
    // z-[100]: por encima de los hotspots (zIndex 50) y de cualquier capa de
    // escena (zIndex 1-4), para que nunca quede tapado ni robado el clic.
    <div className="absolute inset-x-0 bottom-0 z-100 flex justify-center p-6">
      <div className="flex w-full max-w-2xl gap-3 rounded border border-graphite-700 bg-graphite-900/95 p-5 shadow-2xl backdrop-blur">
        {character && portrait && <CharacterPortrait gameId={gameId} portrait={portrait} color={character.color} />}

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
