import { useState, type JSX } from 'react';
import { gameProjects } from '../game-engine/scene-engine/gameProjects';
import { AiIntegrationsPanel } from './AiIntegrationsPanel';
import { DeleteGameDialog } from './DeleteGameDialog';
import { NewGameDialog } from './NewGameDialog';

function prettifyId(id: string): string {
  return id
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function ProjectHub({ onOpenGame }: { onOpenGame: (gameId: string) => void }): JSX.Element {
  const [showIntegrations, setShowIntegrations] = useState(false);
  const [showNewGame, setShowNewGame] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const deletingProject = gameProjects.find((project) => project.id === deletingId);

  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center gap-10 bg-graphite-950 p-8">
      <button
        type="button"
        onClick={() => setShowIntegrations(true)}
        className="absolute top-4 right-4 rounded border border-graphite-700 px-3 py-1 text-[11px] tracking-widest text-graphite-400 uppercase transition-colors hover:border-amber-accent hover:text-amber-accent"
      >
        ⚙ Integraciones IA
      </button>
      {showIntegrations && <AiIntegrationsPanel onClose={() => setShowIntegrations(false)} />}
      {deletingProject && (
        <DeleteGameDialog
          gameId={deletingProject.id}
          title={deletingProject.result.ok ? deletingProject.result.data.case.title : deletingProject.id}
          sceneCount={deletingProject.result.ok ? deletingProject.result.data.scenes.length : null}
          characterCount={deletingProject.result.ok ? deletingProject.result.data.characters.length : null}
          onClose={() => setDeletingId(null)}
          onDelete={async () => {
            const result = await window.api.deleteGame(deletingProject.id, deletingProject.id);
            // Mismo motivo que al crear: el glob de juegos se resuelve al
            // cargar el módulo, así que la lista solo se actualiza recargando.
            if (result.ok) window.location.reload();
            return result;
          }}
        />
      )}
      {showNewGame && (
        <NewGameDialog
          existingIds={gameProjects.map((project) => project.id)}
          onClose={() => setShowNewGame(false)}
          onCreate={async (gameId, title) => {
            const result = await window.api.createGame(gameId, title);
            // Vite ve el index.ts nuevo y rehace el glob de juegos, pero eso
            // es un hot-reload del módulo: recargar es lo que hace que el hub
            // vuelva a leer la lista ya con el juego adentro.
            if (result.ok) window.location.reload();
            return result;
          }}
        />
      )}

      <div className="text-center">
        {/* "Narra" en caja normal y "DOS" en mayúscula y naranja: el corte es
            el nombre, no un adorno — separa las dos lecturas de la palabra.
            En gris el "DOS" parecía apagado, como texto secundario. */}
        <h1 className="text-2xl font-black tracking-tight text-graphite-100 sm:text-3xl">
          Narra<span className="text-amber-accent">DOS</span>
        </h1>
        <p className="mt-2 text-[11px] tracking-widest text-graphite-500 uppercase">Elegí un proyecto para abrir</p>
      </div>

      <div className="flex flex-wrap justify-center gap-4">
        {gameProjects.map((project) => (
          // El botón de borrar va al lado del de abrir, no adentro: un botón
          // dentro de otro no es HTML válido y el click no se puede repartir.
          <div key={project.id} className="group relative">
            <button
              type="button"
              onClick={() => project.result.ok && onOpenGame(project.id)}
              disabled={!project.result.ok}
              className="w-64 rounded border border-graphite-700 bg-graphite-900/60 p-5 text-left transition-colors hover:border-amber-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
              <p className="text-[10px] tracking-widest text-graphite-500 uppercase">{project.id}</p>
              <p className="mt-1 text-lg font-semibold text-graphite-100">{prettifyId(project.id)}</p>
              {project.result.ok ? (
                <p className="mt-2 truncate text-[10px] text-graphite-500">{project.result.data.case.title}</p>
              ) : (
                <p className="mt-2 text-[10px] text-red-400">{project.result.error}</p>
              )}
            </button>
            {/* Aparece al pasar por encima: borrar un proyecto no es algo que
                deba estar siempre a un click de distancia, pero tampoco
                escondido en un menú. Sigue accesible por teclado (focus). */}
            <button
              type="button"
              aria-label={`Borrar ${prettifyId(project.id)}`}
              title="Borrar proyecto"
              onClick={() => setDeletingId(project.id)}
              className="absolute top-2 right-2 rounded border border-graphite-700 px-1.5 py-0.5 text-[10px] text-graphite-600 opacity-0 transition hover:border-red-500 hover:text-red-400 focus:opacity-100 group-hover:opacity-100"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setShowNewGame(true)}
          className="w-64 rounded border border-dashed border-graphite-700 p-5 text-left text-graphite-500 transition-colors hover:border-amber-accent hover:text-amber-accent"
        >
          <p className="text-[10px] tracking-widest uppercase">Nuevo</p>
          <p className="mt-1 text-lg font-semibold">+ Crear juego</p>
          <p className="mt-2 text-[10px]">Arranca con una escena y crece desde el guion.</p>
        </button>
      </div>
    </div>
  );
}
