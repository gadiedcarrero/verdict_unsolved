import { useState, type JSX } from 'react';
import { useCaseBundle } from '../../app/CaseContext';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('es', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function MessagesApp(): JSX.Element {
  const { conversations } = useCaseBundle();
  const [selectedId, setSelectedId] = useState(conversations[0]?.id ?? null);
  const selected = conversations.find((m) => m.id === selectedId) ?? null;

  return (
    <div className="flex h-full text-graphite-100">
      <aside className="w-56 shrink-0 overflow-y-auto border-r border-graphite-700 bg-graphite-850">
        {conversations.map((message) => (
          <button
            key={message.id}
            type="button"
            onClick={() => setSelectedId(message.id)}
            className={`block w-full border-b border-graphite-800 px-3 py-3 text-left text-sm transition-colors ${
              message.id === selectedId
                ? 'bg-graphite-800 text-amber-accent-strong'
                : 'text-graphite-200 hover:bg-graphite-800'
            }`}
          >
            <p className="truncate font-medium">{message.from}</p>
            <p className="truncate text-xs text-graphite-400">{message.subject}</p>
          </button>
        ))}
      </aside>
      <div className="flex-1 overflow-y-auto p-6">
        {selected ? (
          <article>
            <h2 className="text-lg font-semibold text-graphite-100">{selected.subject}</h2>
            <p className="mt-1 text-xs text-graphite-400">
              De: {selected.from} · {formatDate(selected.sentAt)}
            </p>
            <p className="mt-6 whitespace-pre-line text-sm leading-relaxed text-graphite-200">
              {selected.body}
            </p>
          </article>
        ) : (
          <p className="text-sm text-graphite-400">No hay mensajes.</p>
        )}
      </div>
    </div>
  );
}
