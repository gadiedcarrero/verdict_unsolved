import type { JSX } from 'react';
import type { HotspotVerb } from '../game-engine/scene-engine/schemas';
import { translate } from '../i18n/translate';
import { VerbIcon } from './verbIcons';

const RADIUS_PX = 60;
const BUTTON_PX = 44;

/**
 * Menú circular de verbos (Explorar/Interactuar/...) — se abre centrado en
 * un objeto en vez de correr su acción directo. El radio se calcula en
 * píxeles reales del stage (no en % parejo para x e y) para que quede un
 * círculo de verdad y no una elipse, ya que el stage no es cuadrado.
 */
export function HotspotVerbMenu({
  anchor,
  stageWidth,
  stageHeight,
  verbs,
  strings,
  onSelectVerb,
  onClose,
}: {
  /** Centro del objeto, en % del stage. */
  anchor: { x: number; y: number };
  stageWidth: number;
  stageHeight: number;
  verbs: HotspotVerb[];
  strings: Record<string, string>;
  onSelectVerb: (verb: HotspotVerb) => void;
  onClose: () => void;
}): JSX.Element | null {
  if (!stageWidth || !stageHeight || verbs.length === 0) return null;

  return (
    <>
      <div
        className="fixed inset-0 cursor-default"
        style={{ zIndex: 300 }}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-accent shadow-[0_0_8px_rgba(224,166,54,0.9)]"
        style={{ left: `${anchor.x}%`, top: `${anchor.y}%`, zIndex: 301 }}
      />
      {verbs.map((verb, index) => {
        const angle = -Math.PI / 2 + (index * 2 * Math.PI) / verbs.length;
        const left = anchor.x + ((RADIUS_PX * Math.cos(angle)) / stageWidth) * 100;
        const top = anchor.y + ((RADIUS_PX * Math.sin(angle)) / stageHeight) * 100;
        const label = translate(strings, verb.label);
        return (
          <button
            key={verb.id}
            type="button"
            aria-label={label}
            title={label}
            onClick={() => onSelectVerb(verb)}
            className="absolute flex -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-amber-accent bg-graphite-950/95 text-amber-accent shadow-lg transition-transform duration-150 ease-out hover:scale-110 hover:bg-amber-accent hover:text-graphite-950"
            style={{ left: `${left}%`, top: `${top}%`, width: BUTTON_PX, height: BUTTON_PX, zIndex: 301 }}
          >
            <VerbIcon icon={verb.icon} className="h-5 w-5" />
          </button>
        );
      })}
    </>
  );
}
