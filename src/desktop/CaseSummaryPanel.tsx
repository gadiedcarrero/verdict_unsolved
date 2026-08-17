import type { JSX } from 'react';
import { useCaseBundle } from '../app/CaseContext';
import { useNavigationStore } from './navigation.store';

export function CaseSummaryPanel(): JSX.Element {
  const { case: activeCase, evidence, characters } = useCaseBundle();
  const setSection = useNavigationStore((s) => s.setSection);

  return (
    <aside className="hidden w-72 shrink-0 flex-col overflow-y-auto border-l border-graphite-800 bg-graphite-950 p-5 lg:flex">
      <p className="mb-4 text-xs font-semibold tracking-widest text-graphite-400 uppercase">
        Case Summary
      </p>

      <p className="text-[11px] tracking-widest text-amber-accent uppercase">{activeCase.id}</p>
      <h2 className="mt-1 text-xl font-semibold text-graphite-100">{activeCase.title}</h2>

      <p className="mt-4 text-[11px] font-semibold tracking-widest text-graphite-400 uppercase">
        Objective
      </p>
      <p className="mt-1 text-sm leading-relaxed text-graphite-200">{activeCase.initialQuestion}</p>

      <div className="mt-6 space-y-4 border-t border-graphite-800 pt-4">
        <button
          type="button"
          onClick={() => setSection('evidence')}
          className="flex w-full items-center justify-between text-left"
        >
          <span className="text-xs tracking-widest text-graphite-400 uppercase">Evidence</span>
          <span className="text-lg font-semibold text-graphite-100">
            {evidence.length} <span className="text-xs font-normal text-graphite-400">items</span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => setSection('people')}
          className="flex w-full items-center justify-between text-left"
        >
          <span className="text-xs tracking-widest text-graphite-400 uppercase">Suspects</span>
          <span className="text-lg font-semibold text-graphite-100">
            {characters.length}{' '}
            <span className="text-xs font-normal text-graphite-400">persons</span>
          </span>
        </button>
      </div>

      <button
        type="button"
        onClick={() => setSection('evidence')}
        className="mt-auto flex items-center justify-center gap-2 rounded bg-amber-accent px-4 py-2.5 text-sm font-semibold text-graphite-950 transition-colors hover:bg-amber-accent-strong"
      >
        Review Case File
      </button>
    </aside>
  );
}
