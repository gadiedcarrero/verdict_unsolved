import { useState, type JSX } from 'react';
import { slugify } from '../adventure/editor/slug';

/**
 * Crear un juego nuevo. Pide solo el título: el id se deriva y se muestra,
 * porque es lo que va a nombrar la carpeta y las rutas de arte para siempre
 * — mejor que se vea antes de crearlo que descubrirlo después.
 */
export function NewGameDialog({
  existingIds,
  onCreate,
  onClose,
}: {
  existingIds: string[];
  onCreate: (gameId: string, title: string) => Promise<{ ok: boolean; error?: string }>;
  onClose: () => void;
}): JSX.Element {
  const [title, setTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const gameId = title.trim() ? slugify(title) : '';
  const duplicated = gameId.length > 0 && existingIds.includes(gameId);
  const canCreate = gameId.length > 0 && !duplicated && !creating;

  async function handleCreate(): Promise<void> {
    if (!canCreate) return;
    setCreating(true);
    setError(null);
    const result = await onCreate(gameId, title.trim());
    if (!result.ok) {
      setError(result.error ?? 'No se pudo crear el juego.');
      setCreating(false);
    }
  }

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-graphite-950/80 p-6">
      <div className="flex w-full max-w-md flex-col gap-4 rounded border border-graphite-700 bg-graphite-900 p-6">
        <p className="text-xs font-semibold tracking-widest text-graphite-300 uppercase">Juego nuevo</p>

        <label className="flex flex-col gap-1">
          <span className="text-[10px] tracking-widest text-graphite-500 uppercase">Título</span>
          <input
            autoFocus
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void handleCreate();
            }}
            placeholder="El náufrago"
            className="rounded border border-graphite-700 bg-graphite-950 px-3 py-2 text-sm text-graphite-100 outline-none focus:border-amber-accent"
          />
        </label>

        {gameId && (
          <p className="text-[10px] text-graphite-500">
            Carpeta: <span className="text-graphite-300">src/games/{gameId}/</span>
            {duplicated && <span className="ml-2 text-red-400">Ya existe.</span>}
          </p>
        )}

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
            onClick={() => void handleCreate()}
            disabled={!canCreate}
            className="rounded border border-amber-accent/60 px-4 py-1 text-xs tracking-widest text-amber-accent uppercase transition-colors hover:border-amber-accent disabled:cursor-not-allowed disabled:opacity-40"
          >
            {creating ? 'Creando…' : 'Crear'}
          </button>
        </div>
      </div>
    </div>
  );
}
