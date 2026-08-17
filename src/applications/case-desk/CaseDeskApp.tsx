import { useState, type JSX } from 'react';
import { useCaseBundle } from '../../app/CaseContext';
import { Avatar } from '../../components/Avatar';
import { Panel } from '../../components/Panel';
import { useNavigationStore } from '../../desktop/navigation.store';
import type { Evidence } from '../../game-engine/case-loader/schemas';

function findEvidence(evidence: Evidence[], id: string): Evidence | null {
  return evidence.find((item) => item.id === id) ?? null;
}

export function CaseDeskApp(): JSX.Element {
  const bundle = useCaseBundle();
  const {
    case: activeCase,
    characters,
    evidence,
    locations,
    timelineEvents,
    conversations,
  } = bundle;
  const setSection = useNavigationStore((s) => s.setSection);
  const [showNotification, setShowNotification] = useState(true);

  const surveillanceStill = findEvidence(evidence, 'evidence-vehicle-photo');
  const gap = findEvidence(evidence, 'evidence-camera-gap');
  const accessLog = findEvidence(evidence, 'evidence-camera-system-login');
  const messagePing = findEvidence(evidence, 'evidence-recovered-message');
  const mechanicalDiagnosis = findEvidence(evidence, 'evidence-mechanical-diagnosis');
  const location = locations[0];
  const latestMessage = conversations[0];
  const documents = evidence.filter((item) => item.assetPath);

  return (
    <div className="relative h-full overflow-y-auto p-6">
      <div className="grid grid-cols-4 gap-4">
        <Panel title="Surveillance Still" tag={surveillanceStill?.title} className="col-span-2">
          {surveillanceStill?.assetPath && (
            <img
              src={surveillanceStill.assetPath}
              alt={surveillanceStill.title}
              className="h-48 w-full rounded border border-graphite-700 object-cover"
            />
          )}
        </Panel>

        <Panel title={`Suspects · ${characters.length}`} className="col-span-2">
          <div className="flex flex-wrap gap-4">
            {characters.map((character) => (
              <button
                key={character.id}
                type="button"
                onClick={() => setSection('people')}
                className="flex w-16 flex-col items-center gap-1 text-center"
              >
                <Avatar id={character.id} name={character.name} size={44} />
                <span className="truncate text-[11px] text-graphite-300">
                  {character.name.split(' ')[0]}
                </span>
              </button>
            ))}
          </div>
        </Panel>

        <Panel title="Vehicle Evidence" tag="Damaged sedan">
          <p className="text-sm text-graphite-200">{mechanicalDiagnosis?.description}</p>
        </Panel>

        <Panel title="Surveillance Gap" tag="22:24 – 22:28" tone="warning">
          <p className="text-sm text-graphite-200">{gap?.description}</p>
        </Panel>

        <Panel title="Access Log" tag={location?.name}>
          <p className="text-sm text-graphite-200">{accessLog?.description}</p>
        </Panel>

        <Panel title="Message Ping" tag="Lucía Mora">
          <p className="text-sm text-graphite-200">{messagePing?.description}</p>
        </Panel>

        <Panel title={`Timeline · 22:10 – 22:48`} className="col-span-3">
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {timelineEvents.map((event) => (
              <div
                key={event.id}
                className={`flex min-w-27.5 flex-col gap-1 border-l-2 px-2 py-1 ${
                  event.kind === 'camera' && event.endTimestamp
                    ? 'border-red-500'
                    : 'border-graphite-600'
                }`}
              >
                <span className="text-[11px] font-medium text-amber-accent">
                  {event.timestamp}
                  {event.endTimestamp ? `–${event.endTimestamp}` : ''}
                </span>
                <span className="text-[11px] text-graphite-300">{event.label}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Location">
          {location && (
            <div>
              <div className="mb-2 flex h-20 items-center justify-center rounded border border-graphite-700 bg-graphite-900">
                <span className="h-2 w-2 animate-pulse rounded-full bg-amber-accent" />
              </div>
              <p className="text-sm font-medium text-graphite-100">{location.name}</p>
            </div>
          )}
        </Panel>

        <Panel title={`Documents · ${documents.length}`} className="col-span-4">
          <div className="flex gap-3">
            {documents.map((doc) => (
              <button
                key={doc.id}
                type="button"
                onClick={() => setSection('evidence')}
                className="w-24 shrink-0 text-center"
              >
                <img
                  src={doc.assetPath}
                  alt=""
                  className="h-28 w-full rounded border border-graphite-700 object-cover"
                />
                <p className="mt-1 truncate text-[11px] text-graphite-300">{doc.title}</p>
              </button>
            ))}
          </div>
        </Panel>
      </div>

      {showNotification && latestMessage && (
        <div className="absolute bottom-4 left-6 w-80 rounded border border-graphite-700 bg-graphite-900 p-4 shadow-2xl shadow-black/50">
          <div className="mb-2 flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Avatar id="client" name={activeCase.clientName} size={28} />
              <div>
                <p className="text-xs font-medium text-graphite-100">New Message</p>
                <p className="text-[11px] text-graphite-400">{latestMessage.subject}</p>
              </div>
            </div>
            <button
              type="button"
              aria-label="Descartar notificación"
              onClick={() => setShowNotification(false)}
              className="text-graphite-500 hover:text-graphite-200"
            >
              ×
            </button>
          </div>
          <button
            type="button"
            onClick={() => setSection('messages')}
            className="w-full rounded bg-graphite-800 px-3 py-2 text-xs font-semibold text-amber-accent transition-colors hover:bg-graphite-700"
          >
            Open Message
          </button>
        </div>
      )}
    </div>
  );
}
