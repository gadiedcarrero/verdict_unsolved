import type { JSX } from 'react';
import { translate } from '../i18n/translate';

/**
 * La cuenta regresiva de la escena, arriba al centro.
 *
 * Se pone en rojo y late en los últimos diez segundos: la tensión de una
 * escena con reloj depende de que el jugador SEPA que se le acaba, y un número
 * chico en gris no se lee mientras se está buscando dónde hacer click.
 */
export function SceneTimerBar({
  seconds,
  label,
  strings,
}: {
  seconds: number;
  label: string;
  strings: Record<string, string>;
}): JSX.Element {
  const urgent = seconds <= 10;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center p-3" style={{ zIndex: 360 }}>
      <div
        className={`flex items-baseline gap-2 rounded px-4 py-1.5 ${
          urgent ? 'animate-pulse bg-red-950/90' : 'bg-graphite-950/85'
        }`}
      >
        <span className="text-[0.6rem] tracking-widest text-graphite-400 uppercase">{translate(strings, label)}</span>
        <span
          className={`font-mono text-lg font-bold tabular-nums ${urgent ? 'text-red-400' : 'text-graphite-100'}`}
        >
          {minutes}:{String(rest).padStart(2, '0')}
        </span>
      </div>
    </div>
  );
}
