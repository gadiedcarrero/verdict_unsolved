import type { JSX, ReactNode } from 'react';

export function Panel({
  title,
  tag,
  tone = 'default',
  className = '',
  children,
}: {
  title: string;
  tag?: string | undefined;
  tone?: 'default' | 'warning';
  className?: string;
  children: ReactNode;
}): JSX.Element {
  const toneClasses =
    tone === 'warning' ? 'border-red-900/60 bg-red-950/20' : 'border-graphite-700 bg-graphite-850';

  return (
    <section className={`flex flex-col rounded border p-4 ${toneClasses} ${className}`}>
      <header className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-semibold tracking-widest text-graphite-400 uppercase">
          {title}
        </h3>
        {tag && (
          <span
            className={`text-[11px] font-medium tracking-wide uppercase ${
              tone === 'warning' ? 'text-red-400' : 'text-amber-accent'
            }`}
          >
            {tag}
          </span>
        )}
      </header>
      {children}
    </section>
  );
}
