import { useState, type JSX } from 'react';

/**
 * Borrar un proyecto. Pide escribir el id a mano.
 *
 * Es una fricción puesta a propósito: borra la carpeta del juego y TODA su
 * carpeta de arte, que puede ser cientos de imágenes generadas. Un botón con
 * un "¿seguro?" se acepta sin leer; escribir el id obliga a mirar cuál se
 * está borrando, que es justo el error que importa evitar — equivocarse de
 * proyecto, no arrepentirse del que se eligió.
 */
export function DeleteGameDialog({
  gameId,
  title,
  sceneCount,
  characterCount,
  onDelete,
  onClose,
}: {
  gameId: string;
  title: string;
  /** Null si el proyecto no carga (bundle inválido): no se puede contar lo
   * que tiene, pero borrarlo tiene que seguir siendo posible — un proyecto
   * roto es justamente uno que se quiere sacar de encima. */
  sceneCount: number | null;
  characterCount: number | null;
  onDelete: () => Promise<{ ok: boolean; error?: string }>;
  onClose: () => void;
}): JSX.Element {
  const [confirmation, setConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canDelete = confirmation.trim() === gameId && !deleting;

  async function handleDelete(): Promise<void> {
    if (!canDelete) return;
    setDeleting(true);
    setError(null);
    const result = await onDelete();
    if (!result.ok) {
      setError(result.error ?? 'No se pudo borrar el proyecto.');
      setDeleting(false);
    }
  }

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-graphite-950/80 p-6">
      <div className="flex w-full max-w-md flex-col gap-4 rounded border border-red-500/40 bg-graphite-900 p-6">
        <p className="text-xs font-semibold tracking-widest text-red-400 uppercase">Borrar proyecto</p>

        <div className="flex flex-col gap-1 text-[11px] text-graphite-300">
          <p>
            Se borran las dos carpetas de <span className="text-graphite-100">{title}</span>:
          </p>
          <p className="text-graphite-500">
            src/games/{gameId}/ — escenas, personajes, textos, desglose
            <br />
            assets/games/{gameId}/ — retratos, fondos, cursores
          </p>
          {sceneCount !== null && characterCount !== null && (
            <p className="mt-1 text-graphite-400">
              Hoy tiene {sceneCount} escena{sceneCount === 1 ? '' : 's'} y {characterCount} personaje
              {characterCount === 1 ? '' : 's'}, con todo el arte que se les haya generado.
            </p>
          )}
        </div>

        <p className="rounded border border-graphite-800 bg-graphite-950 p-2 text-[10px] text-graphite-400">
          En disco no se puede deshacer. Lo que esté commiteado se puede recuperar de git; lo que no, no.
        </p>

        <label className="flex flex-col gap-1">
          <span className="text-[10px] tracking-widest text-graphite-500 uppercase">
            Escribí <span className="text-graphite-200">{gameId}</span> para confirmar
          </span>
          <input
            autoFocus
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void handleDelete();
            }}
            className="rounded border border-graphite-700 bg-graphite-950 px-3 py-2 text-sm text-graphite-100 outline-none focus:border-red-500"
          />
        </label>

        {error && <p className="text-[11px] text-red-400">{error}</p>}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="text-xs tracking-widest text-graphite-400 uppercase hover:text-graphite-200"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void handleDelete()}
            disabled={!canDelete}
            className="rounded border border-red-500/60 px-4 py-1 text-xs tracking-widest text-red-400 uppercase transition-colors hover:border-red-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {deleting ? 'Borrando…' : 'Borrar'}
          </button>
        </div>
      </div>
    </div>
  );
}
