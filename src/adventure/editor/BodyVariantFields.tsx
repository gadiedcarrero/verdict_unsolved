import { useState, type JSX } from 'react';
import { BODY_EXPRESSIONS } from '../../../shared/emotions';
import type { Character } from '../../game-engine/scene-engine/schemas';
import { gameAssetUrl } from '../gameAssetUrl';

/**
 * Cuerpos enteros para poner EN la escena, con fondo transparente — distinto
 * del busto de arriba, que es el del círculo de diálogo.
 *
 * Una variante es una identidad visual del personaje con UNA pose fija: Gray
 * en su silla de ruedas, Wraith enmascarado de pie, Adrian de pie. Cada una
 * lleva sus propias expresiones sobre esa misma pose, así el costo es
 * variantes × expresiones y no variantes × poses × expresiones.
 *
 * La referencia visual se encadena: el cuerpo parte del busto ya generado del
 * personaje, y cada expresión parte de ese cuerpo. Por eso hace falta el
 * retrato base antes de poder generar nada acá.
 */
export function BodyVariantFields({
  gameId,
  character,
  generatingArtIds,
  artErrors,
  portraitCacheBust,
  onCreate,
  onRemove,
  onGenerate,
  onPreview,
}: {
  gameId: string;
  character: Character;
  generatingArtIds: string[];
  artErrors: Record<string, string>;
  portraitCacheBust: Record<string, number>;
  onCreate: (label: string, description: string) => void;
  onRemove: (variantId: string) => void;
  /** `expressionKey` null = el cuerpo neutral de la variante. */
  onGenerate: (variantId: string, expressionKey: string | null) => void;
  onPreview: (assetPath: string) => void;
}): JSX.Element {
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');

  const variants = Object.entries(character.variants);
  const hasPortrait = Boolean(character.portrait);

  function create(): void {
    if (!label.trim() || !description.trim()) return;
    onCreate(label, description);
    setLabel('');
    setDescription('');
  }

  return (
    <div className="mt-2 border-t border-graphite-800 pt-1">
      <p className="mb-1 text-[9px] text-graphite-500 uppercase">Cuerpo entero (para la escena)</p>

      {!hasPortrait && (
        <p className="mb-1 text-[9px] text-graphite-600">
          Generá primero el retrato base — el cuerpo parte de esa imagen para que sea la misma persona.
        </p>
      )}

      {/* Sin esto la sección se ve como un formulario que no hace nada: los
          botones de generar aparecen recién dentro de cada pose, y no hay
          ninguna hasta que se agregue la primera. */}
      {variants.length === 0 && (
        <p className="mb-1 text-[9px] text-graphite-600">
          Agregá una pose acá abajo (Gray en su silla, Wraith de pie…) y después vas a poder generarle el cuerpo y
          sus gestos.
        </p>
      )}

      {variants.map(([variantId, variant]) => {
        const bodyGenId = `${character.id}:${variantId}`;
        return (
          <div key={variantId} className="mb-1 rounded border border-graphite-800 bg-graphite-950/60 p-1.5">
            <div className="mb-1 flex items-center gap-2">
              <BodyPreview
                gameId={gameId}
                path={variant.body}
                cacheBust={variant.body ? portraitCacheBust[variant.body] : undefined}
                onPreview={onPreview}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[9px] text-graphite-200">{variant.label || variantId}</p>
                <p className="truncate text-[8px] text-graphite-600">{variant.description}</p>
              </div>
              <button
                type="button"
                onClick={() => onRemove(variantId)}
                className="text-[8px] text-graphite-500 hover:text-red-400"
              >
                Quitar
              </button>
            </div>

            <button
              type="button"
              disabled={!hasPortrait || generatingArtIds.includes(bodyGenId)}
              onClick={() => onGenerate(variantId, null)}
              className="mb-1 w-full rounded border border-graphite-700 px-1.5 py-0.5 text-[9px] tracking-widest text-graphite-300 uppercase transition-colors hover:border-amber-accent hover:text-amber-accent disabled:opacity-40"
            >
              {generatingArtIds.includes(bodyGenId)
                ? 'Generando...'
                : variant.body
                  ? 'Regenerar cuerpo'
                  : 'Generar cuerpo con IA'}
            </button>
            {artErrors[bodyGenId] && <p className="mb-1 text-[8px] text-red-400">{artErrors[bodyGenId]}</p>}

            {/* Las expresiones parten del cuerpo, no del busto: si el cuerpo
                todavía no existe no hay de dónde sacar la pose. */}
            {variant.body && (
              <div className="flex flex-wrap gap-1">
                {BODY_EXPRESSIONS.map(({ code, label: emotionLabel }) => {
                  const genId = `${character.id}:${variantId}:${code}`;
                  const done = Boolean(variant.expressions[code]?.path);
                  return (
                    <button
                      key={code}
                      type="button"
                      disabled={generatingArtIds.includes(genId)}
                      onClick={() => onGenerate(variantId, code)}
                      className={`rounded border px-1.5 py-0.5 text-[8px] transition-colors disabled:opacity-40 ${
                        done
                          ? 'border-amber-accent text-amber-accent'
                          : 'border-graphite-700 text-graphite-500 hover:border-graphite-500'
                      }`}
                    >
                      {generatingArtIds.includes(genId) ? '...' : emotionLabel}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      <div className="rounded border border-graphite-800 p-1.5">
        <input
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          placeholder="Nombre de la pose (ej. En su silla de ruedas)"
          className="mb-1 w-full rounded border border-graphite-800 bg-graphite-950 px-1.5 py-0.5 text-[9px] text-graphite-200 outline-none focus:border-amber-accent"
        />
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={2}
          placeholder="Cómo se ve de cuerpo entero, en inglés (seated in a wheelchair, dark suit, hands resting on the armrests...)"
          className="mb-1 w-full resize-none rounded border border-graphite-800 bg-graphite-950 px-1.5 py-0.5 text-[9px] text-graphite-200 outline-none focus:border-amber-accent"
        />
        <button
          type="button"
          onClick={create}
          disabled={!label.trim() || !description.trim()}
          className="w-full rounded border border-graphite-700 px-1.5 py-0.5 text-[9px] tracking-widest text-graphite-400 uppercase transition-colors hover:border-amber-accent hover:text-amber-accent disabled:opacity-40"
        >
          + Agregar pose
        </button>
      </div>
    </div>
  );
}

function BodyPreview({
  gameId,
  path,
  cacheBust,
  onPreview,
}: {
  gameId: string;
  path: string | null;
  cacheBust: number | undefined;
  onPreview: (assetPath: string) => void;
}): JSX.Element {
  if (!path) {
    return (
      <div className="flex h-10 w-8 shrink-0 items-center justify-center rounded border border-dashed border-graphite-700 text-[7px] text-graphite-600">
        sin foto
      </div>
    );
  }
  return (
    <button type="button" onClick={() => onPreview(path)} className="shrink-0">
      <img
        src={`${gameAssetUrl(gameId, path)}${cacheBust ? `?v=${cacheBust}` : ''}`}
        alt=""
        className="h-10 w-8 rounded border border-graphite-700 object-contain"
      />
    </button>
  );
}
