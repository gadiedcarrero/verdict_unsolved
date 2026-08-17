import type { JSX } from 'react';
import { useCaseBundle } from '../../app/CaseContext';
import { Panel } from '../../components/Panel';

export function LocationsApp(): JSX.Element {
  const { locations, characters } = useCaseBundle();

  return (
    <div className="h-full overflow-y-auto p-6 text-graphite-100">
      <h2 className="mb-4 text-sm font-semibold tracking-wide text-graphite-400 uppercase">
        Locations · {locations.length}
      </h2>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {locations.map((location) => {
          const related = characters.filter((c) => location.relatedEntityIds.includes(c.id));
          return (
            <Panel key={location.id} title={location.name}>
              <div className="mb-3 flex h-32 items-center justify-center rounded border border-graphite-700 bg-graphite-900">
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-amber-accent" />
              </div>
              <p className="text-sm leading-relaxed text-graphite-200">{location.description}</p>
              {related.length > 0 && (
                <p className="mt-3 text-xs text-graphite-400">
                  Relacionado con: {related.map((c) => c.name).join(', ')}
                </p>
              )}
            </Panel>
          );
        })}
      </div>
    </div>
  );
}
