import type { JSX } from 'react';
import { gameProjects } from '../game-engine/scene-engine/gameProjects';

function prettifyId(id: string): string {
  return id
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function ProjectHub({ onOpenGame }: { onOpenGame: (gameId: string) => void }): JSX.Element {
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center gap-10 bg-graphite-950 p-8">
      <div className="text-center">
        <h1 className="text-2xl font-black tracking-tight text-graphite-100 sm:text-3xl">
          VERDICT UNSOLVED <span className="text-graphite-500">ENGINE</span>
        </h1>
        <p className="mt-2 text-[11px] tracking-widest text-graphite-500 uppercase">Elegí un proyecto para abrir</p>
      </div>

      <div className="flex flex-wrap justify-center gap-4">
        {gameProjects.map((project) => (
          <button
            key={project.id}
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
        ))}
        {gameProjects.length === 0 && (
          <p className="text-sm text-graphite-500">No hay ningún proyecto todavía en src/games/.</p>
        )}
      </div>
    </div>
  );
}
