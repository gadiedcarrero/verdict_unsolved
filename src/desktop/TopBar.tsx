import type { JSX } from 'react';
import { useCaseBundle } from '../app/CaseContext';
import { useSaveStore } from '../game-engine/save-system/save.store';

export function TopBar(): JSX.Element {
  const { case: activeCase } = useCaseBundle();
  const money = useSaveStore((s) => s.money);
  const reputation = useSaveStore((s) => s.reputation);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-graphite-800 bg-graphite-950 px-5">
      <div className="flex items-center gap-4">
        <span className="flex h-8 w-8 items-center justify-center rounded border border-amber-accent text-sm font-bold text-amber-accent">
          V:
        </span>
        <span className="hidden text-sm font-semibold tracking-wide text-graphite-100 sm:inline">
          VERDICT: UNSOLVED
        </span>
        <span className="mx-2 h-5 w-px bg-graphite-700" />
        <span className="text-xs font-medium tracking-widest text-amber-accent uppercase">
          {activeCase.title}
        </span>
      </div>

      <div className="flex items-center gap-2 text-xs text-graphite-300">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-accent" />
        CASE ACTIVE
      </div>

      <div className="flex items-center gap-5 text-sm">
        <div className="text-right">
          <p className="text-[10px] tracking-widest text-graphite-400 uppercase">Balance</p>
          <p className="font-semibold text-graphite-100">${money.toLocaleString('en-US')}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] tracking-widest text-graphite-400 uppercase">Reputation</p>
          <p className="font-semibold text-graphite-100">{reputation}</p>
        </div>
        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-graphite-700 text-graphite-400">
          ●
        </span>
      </div>
    </header>
  );
}
