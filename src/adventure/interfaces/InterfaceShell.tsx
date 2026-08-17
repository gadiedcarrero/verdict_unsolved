import type { JSX, ReactNode } from 'react';

/** Contenedor de pantalla completa para las interfaces tipo computadora
 * (MIRROR, mercado de agentes, tienda). z-100: por encima de capas de
 * escena, hotspots y del propio DialogueOverlay, que se cierra al abrir
 * una interfaz (ver adventureRuntime.store.ts). */
export function InterfaceShell({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
}): JSX.Element {
  return (
    <div className="absolute inset-0 z-100 flex items-center justify-center bg-graphite-950/90 p-8 backdrop-blur-sm">
      <div className="flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded border border-graphite-700 bg-graphite-900 shadow-2xl">
        <header className="flex items-center justify-between border-b border-graphite-700 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold tracking-widest text-amber-accent uppercase">{title}</h2>
            {subtitle && <p className="mt-1 text-xs text-graphite-400">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-graphite-700 px-3 py-1 text-[11px] tracking-widest text-graphite-400 uppercase transition-colors hover:border-amber-accent hover:text-amber-accent"
          >
            Cerrar
          </button>
        </header>
        <div className="overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}
