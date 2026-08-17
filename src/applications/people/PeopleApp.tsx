import type { JSX } from 'react';
import { Avatar } from '../../components/Avatar';
import { useCaseBundle } from '../../app/CaseContext';

export function PeopleApp(): JSX.Element {
  const { characters } = useCaseBundle();

  return (
    <div className="h-full overflow-y-auto p-6 text-graphite-100">
      <h2 className="mb-4 text-sm font-semibold tracking-wide text-graphite-400 uppercase">
        Personas de interés · {characters.length}
      </h2>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {characters.map((character) => (
          <li
            key={character.id}
            className="flex gap-3 rounded border border-graphite-700 bg-graphite-850 p-4"
          >
            <Avatar id={character.id} name={character.name} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-graphite-100">{character.name}</p>
              <p className="text-xs text-amber-accent">{character.role}</p>
              <p className="mt-1 text-sm text-graphite-300">{character.description}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
