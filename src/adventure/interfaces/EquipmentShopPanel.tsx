import { useState, type JSX } from 'react';
import { useSaveStore } from '../../game-engine/save-system/save.store';
import { useAdventureRuntimeStore } from '../adventureRuntime.store';
import { InterfaceShell } from './InterfaceShell';

export function EquipmentShopPanel(): JSX.Element {
  const bundle = useAdventureRuntimeStore((s) => s.bundle);
  const caseState = useAdventureRuntimeStore((s) => s.caseState);
  const applyStatePatch = useAdventureRuntimeStore((s) => s.applyStatePatch);
  const closeInterface = useAdventureRuntimeStore((s) => s.closeInterface);
  const money = useSaveStore((s) => s.money);
  const addMoney = useSaveStore((s) => s.addMoney);

  const items = bundle?.equipmentItems ?? [];
  const confirmed = caseState.equipmentOwned.length > 0;
  const [selectedIds, setSelectedIds] = useState<string[]>(caseState.equipmentOwned);

  const total = items.filter((item) => selectedIds.includes(item.id)).reduce((sum, item) => sum + item.price, 0);
  const remaining = money - total;

  function toggle(itemId: string): void {
    if (confirmed) return;
    setSelectedIds((prev) => (prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]));
  }

  function confirmLoadout(): void {
    if (confirmed || total > money || selectedIds.length === 0) return;
    addMoney(-total);
    applyStatePatch({ equipmentOwned: selectedIds });
  }

  return (
    <InterfaceShell
      title="Tienda de equipo"
      subtitle={confirmed ? 'Loadout confirmado — el equipo queda con el agente.' : `Fondos disponibles: $${money}`}
      onClose={closeInterface}
    >
      <ul className="space-y-2">
        {items.map((item) => {
          const checked = selectedIds.includes(item.id);
          return (
            <li key={item.id}>
              <label
                className={`flex items-start justify-between gap-3 rounded border p-3 text-sm ${
                  checked ? 'border-amber-accent/60 bg-graphite-850' : 'border-graphite-700'
                } ${confirmed ? 'opacity-80' : 'cursor-pointer'}`}
              >
                <span className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(item.id)}
                    disabled={confirmed}
                    className="mt-1"
                  />
                  <span>
                    <span className="block font-medium text-graphite-100">{item.name}</span>
                    <span className="block text-xs text-graphite-400">
                      {item.function} · Riesgo al perderlo: {item.riskLabel}
                    </span>
                  </span>
                </span>
                <span className="shrink-0 text-graphite-300">${item.price}</span>
              </label>
            </li>
          );
        })}
      </ul>

      <div className="mt-4 flex items-center justify-between border-t border-graphite-700 pt-4">
        <p className="text-xs text-graphite-400">
          Total seleccionado: ${total} · Quedarían: ${remaining}
        </p>
        {!confirmed && (
          <button
            type="button"
            onClick={confirmLoadout}
            disabled={total > money || selectedIds.length === 0}
            className="rounded border border-amber-accent px-4 py-1.5 text-xs font-semibold tracking-widest text-amber-accent uppercase transition-colors hover:bg-amber-accent hover:text-graphite-950 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-amber-accent"
          >
            Confirmar loadout
          </button>
        )}
      </div>
    </InterfaceShell>
  );
}
