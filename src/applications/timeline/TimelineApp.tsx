import type { JSX } from 'react';
import { useCaseBundle } from '../../app/CaseContext';

const KIND_LABEL: Record<string, string> = {
  camera: 'Cámara',
  access: 'Acceso',
  ping: 'Mensaje',
  event: 'Evento',
};

export function TimelineApp(): JSX.Element {
  const { timelineEvents, evidence } = useCaseBundle();

  return (
    <div className="h-full overflow-y-auto p-6 text-graphite-100">
      <h2 className="mb-6 text-sm font-semibold tracking-wide text-graphite-400 uppercase">
        Timeline del caso
      </h2>
      <ol className="relative space-y-6 border-l border-graphite-700 pl-6">
        {timelineEvents.map((event) => {
          const relatedEvidence = evidence.find((item) => item.id === event.relatedEvidenceId);
          const isGap = Boolean(event.endTimestamp);
          return (
            <li key={event.id} className="relative">
              <span
                className={`absolute top-1 -left-[29px] h-3 w-3 rounded-full border-2 ${
                  isGap ? 'border-red-500 bg-graphite-950' : 'border-amber-accent bg-graphite-950'
                }`}
              />
              <p className="text-sm font-semibold text-amber-accent">
                {event.timestamp}
                {event.endTimestamp ? ` – ${event.endTimestamp}` : ''}
                <span className="ml-2 text-[11px] font-normal tracking-widest text-graphite-500 uppercase">
                  {KIND_LABEL[event.kind]}
                </span>
              </p>
              <p className="mt-1 text-sm text-graphite-200">{event.label}</p>
              {relatedEvidence && (
                <p className="mt-1 text-xs text-graphite-500">
                  Evidencia relacionada: {relatedEvidence.title}
                </p>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
