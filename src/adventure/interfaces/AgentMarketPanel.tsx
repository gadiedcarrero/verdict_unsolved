import type { JSX } from 'react';
import { useSaveStore } from '../../game-engine/save-system/save.store';
import type { AgentDef } from '../../game-engine/scene-engine/schemas';
import { useAdventureRuntimeStore } from '../adventureRuntime.store';
import { InterfaceShell } from './InterfaceShell';

const STAT_LABEL: Record<string, string> = { baja: 'Baja', media: 'Media', alta: 'Alta' };

function AgentCard({
  agent,
  hired,
  disabled,
  onHire,
}: {
  agent: AgentDef;
  hired: boolean;
  disabled: boolean;
  onHire: () => void;
}): JSX.Element {
  return (
    <div
      className={`flex flex-col rounded border p-4 ${
        hired ? 'border-amber-accent bg-graphite-850' : 'border-graphite-700'
      }`}
    >
      <p className="text-sm font-semibold text-graphite-100">
        {agent.codename} <span className="text-xs font-normal text-graphite-400">— {agent.name}</span>
      </p>
      <dl className="mt-3 space-y-1 text-xs text-graphite-300">
        <div className="flex justify-between">
          <dt>Costo</dt>
          <dd>${agent.cost}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Infiltración</dt>
          <dd>{STAT_LABEL[agent.infiltration]}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Técnica</dt>
          <dd>{STAT_LABEL[agent.technique]}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Resistencia</dt>
          <dd>{STAT_LABEL[agent.resistance]}</dd>
        </div>
      </dl>
      <p className="mt-3 text-xs text-graphite-300">
        <span className="text-amber-accent-strong">Ventaja: </span>
        {agent.advantage}
      </p>
      <p className="mt-1 text-xs text-graphite-400">
        <span className="text-graphite-300">Desventaja: </span>
        {agent.disadvantage}
      </p>
      <button
        type="button"
        onClick={onHire}
        disabled={disabled}
        className="mt-4 rounded border border-amber-accent px-3 py-1.5 text-xs font-semibold tracking-widest text-amber-accent uppercase transition-colors hover:bg-amber-accent hover:text-graphite-950 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-amber-accent"
      >
        {hired ? 'Contratado' : 'Contratar'}
      </button>
    </div>
  );
}

export function AgentMarketPanel(): JSX.Element {
  const bundle = useAdventureRuntimeStore((s) => s.bundle);
  const caseState = useAdventureRuntimeStore((s) => s.caseState);
  const applyStatePatch = useAdventureRuntimeStore((s) => s.applyStatePatch);
  const closeInterface = useAdventureRuntimeStore((s) => s.closeInterface);
  const money = useSaveStore((s) => s.money);
  const addMoney = useSaveStore((s) => s.addMoney);

  const agents = bundle?.agents ?? [];

  function hire(agent: AgentDef): void {
    if (caseState.selectedAgent || money < agent.cost) return;
    addMoney(-agent.cost);
    applyStatePatch({ selectedAgent: agent.id, agentTrust: agent.trustInitial });
  }

  return (
    <InterfaceShell title="Mercado clandestino" subtitle={`Fondos disponibles: $${money}`} onClose={closeInterface}>
      {caseState.selectedAgent && (
        <p className="mb-4 text-xs text-graphite-400">
          Ya contrataste a un agente para este caso. No hace falta elegir otro.
        </p>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {agents.map((agent) => (
          <AgentCard
            key={agent.id}
            agent={agent}
            hired={caseState.selectedAgent === agent.id}
            disabled={caseState.selectedAgent !== null || money < agent.cost}
            onHire={() => hire(agent)}
          />
        ))}
      </div>
    </InterfaceShell>
  );
}
