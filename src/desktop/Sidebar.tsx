import type { JSX } from 'react';
import { NAV_ITEMS } from './appRegistry';
import { LogoutIcon } from './icons';
import { useNavigationStore } from './navigation.store';

export function Sidebar({ onLogout }: { onLogout: () => void }): JSX.Element {
  const activeSection = useNavigationStore((s) => s.activeSection);
  const setSection = useNavigationStore((s) => s.setSection);

  return (
    <nav className="flex w-52 shrink-0 flex-col border-r border-graphite-800 bg-graphite-950 py-3">
      <ul className="flex-1 space-y-0.5 px-2">
        {NAV_ITEMS.map((item) => {
          const isActive = item.id === activeSection;
          const Icon = item.icon;
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => setSection(item.id)}
                className={`flex w-full items-center gap-3 rounded px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? 'bg-graphite-800 text-amber-accent-strong'
                    : 'text-graphite-300 hover:bg-graphite-850 hover:text-graphite-100'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </button>
            </li>
          );
        })}
      </ul>
      <div className="border-t border-graphite-800 px-2 pt-2">
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded px-3 py-2 text-sm text-graphite-400 transition-colors hover:bg-graphite-850 hover:text-graphite-100"
        >
          <LogoutIcon className="h-4 w-4 shrink-0" />
          Log out
        </button>
      </div>
    </nav>
  );
}
