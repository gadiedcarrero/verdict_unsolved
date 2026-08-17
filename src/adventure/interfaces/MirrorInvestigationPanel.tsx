import { useState, type JSX } from 'react';
import { useAdventureRuntimeStore } from '../adventureRuntime.store';
import { InterfaceShell } from './InterfaceShell';

export function MirrorInvestigationPanel(): JSX.Element {
  const bundle = useAdventureRuntimeStore((s) => s.bundle);
  const caseState = useAdventureRuntimeStore((s) => s.caseState);
  const applyStatePatch = useAdventureRuntimeStore((s) => s.applyStatePatch);
  const addFlag = useAdventureRuntimeStore((s) => s.addFlag);
  const closeInterface = useAdventureRuntimeStore((s) => s.closeInterface);
  const openDialogue = useAdventureRuntimeStore((s) => s.openDialogue);

  const [openedAreaIds, setOpenedAreaIds] = useState<string[]>([]);
  const [hintLevel, setHintLevel] = useState(0);

  const areas = bundle?.investigationAreas ?? [];
  const hints = bundle?.mirrorHints ?? [];

  function openArea(areaId: string): void {
    setOpenedAreaIds((prev) => (prev.includes(areaId) ? prev : [...prev, areaId]));
    if (areaId === 'base-acheron' && !caseState.clientTruthDiscovered) {
      applyStatePatch({ clientTruthDiscovered: true });
      addFlag('contradiccion-encontrada');
    }
  }

  function requestNextHint(): void {
    if (hintLevel >= hints.length) return;
    setHintLevel((level) => level + 1);
    applyStatePatch({ mirrorHintsUsed: caseState.mirrorHintsUsed + 1 });
  }

  function confront(): void {
    closeInterface();
    openDialogue('confrontar-lena-1');
  }

  return (
    <InterfaceShell
      title="MIRROR — Verificar al cliente"
      subtitle="Objetivo: descubrir al menos una contradicción antes de contratar."
      onClose={closeInterface}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {areas.map((area) => {
          const opened = openedAreaIds.includes(area.id);
          return (
            <button
              key={area.id}
              type="button"
              onClick={() => openArea(area.id)}
              className={`rounded border p-3 text-left text-sm transition-colors ${
                opened
                  ? 'border-amber-accent/60 bg-graphite-850 text-graphite-100'
                  : 'border-graphite-700 text-graphite-300 hover:border-amber-accent/40'
              }`}
            >
              <p className="text-xs font-semibold tracking-widest text-amber-accent-strong uppercase">
                {area.title}
              </p>
              <p className="mt-2 leading-relaxed">{opened ? area.body : '(sin revisar)'}</p>
            </button>
          );
        })}
      </div>

      <div className="mt-5 rounded border border-graphite-700 bg-graphite-850 p-4">
        <p className="text-xs font-semibold tracking-widest text-graphite-400 uppercase">Pistas de MIRROR</p>
        <div className="mt-2 space-y-2">
          {hints.slice(0, hintLevel).map((hint) => (
            <p key={hint.level} className="text-sm text-graphite-200">
              <span className="mr-2 text-xs font-semibold text-amber-accent-strong uppercase">
                {hint.label}:
              </span>
              {hint.text}
            </p>
          ))}
        </div>
        {hintLevel < hints.length && (
          <button
            type="button"
            onClick={requestNextHint}
            className="mt-3 rounded border border-graphite-700 px-3 py-1.5 text-xs tracking-widest text-graphite-300 uppercase transition-colors hover:border-amber-accent hover:text-amber-accent"
          >
            Pedir pista a MIRROR
          </button>
        )}
      </div>

      <div className="mt-5 flex items-center justify-between">
        <p className="text-xs text-graphite-500">
          {caseState.clientTruthDiscovered
            ? 'Contradicción encontrada: la profesión declarada por Lena es falsa.'
            : 'Todavía no se encontró ninguna contradicción.'}
        </p>
        <button
          type="button"
          onClick={confront}
          className="rounded border border-amber-accent px-4 py-1.5 text-xs font-semibold tracking-widest text-amber-accent uppercase transition-colors hover:bg-amber-accent hover:text-graphite-950"
        >
          Confrontar a Lena
        </button>
      </div>
    </InterfaceShell>
  );
}
