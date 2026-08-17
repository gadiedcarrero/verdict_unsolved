import { useState, type JSX } from 'react';
import { useCaseBundle } from '../../app/CaseContext';

export function EvidenceApp(): JSX.Element {
  const { evidence } = useCaseBundle();
  const [selectedId, setSelectedId] = useState(evidence[0]?.id ?? null);
  const selected = evidence.find((item) => item.id === selectedId) ?? null;

  return (
    <div className="flex h-full text-graphite-100">
      <aside className="grid w-56 shrink-0 auto-rows-min grid-cols-1 gap-2 overflow-y-auto border-r border-graphite-700 bg-graphite-850 p-3">
        {evidence.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setSelectedId(item.id)}
            className={`flex items-center gap-3 rounded p-2 text-left transition-colors ${
              item.id === selectedId ? 'bg-graphite-800' : 'hover:bg-graphite-800'
            }`}
          >
            {item.assetPath ? (
              <img
                src={item.assetPath}
                alt=""
                className="h-12 w-12 shrink-0 rounded border border-graphite-700 object-cover"
              />
            ) : (
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded border border-graphite-700 bg-graphite-900 text-[10px] tracking-widest text-graphite-400 uppercase">
                Doc
              </span>
            )}
            <span className="text-xs text-graphite-200">{item.title}</span>
          </button>
        ))}
      </aside>
      <div className="flex-1 overflow-y-auto p-6">
        {selected ? (
          <article>
            {selected.assetPath && (
              <img
                src={selected.assetPath}
                alt={selected.title}
                className="max-h-80 rounded border border-graphite-700"
              />
            )}
            <h2 className="mt-4 text-lg font-semibold">{selected.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-graphite-200">{selected.description}</p>
            <p className="mt-3 text-xs text-graphite-400">Fuente: {selected.source}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {selected.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-graphite-700 px-2 py-0.5 text-[11px] text-amber-accent uppercase"
                >
                  {tag}
                </span>
              ))}
            </div>
          </article>
        ) : (
          <p className="text-sm text-graphite-400">No hay evidencia disponible.</p>
        )}
      </div>
    </div>
  );
}
