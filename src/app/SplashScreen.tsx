import type { JSX } from 'react';

function CornerBracket({ className }: { className: string }): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M2 8V2h6M22 8V2h-6M2 16v6h6M22 16v6h-6" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function SplashScreen({ onEnter }: { onEnter: () => void }): JSX.Element {
  return (
    <div className="relative flex h-screen w-screen items-center justify-center overflow-hidden bg-graphite-950">
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 30% 40%, rgba(224,166,54,0.08), transparent 55%), radial-gradient(ellipse at 80% 70%, rgba(107,147,168,0.06), transparent 50%)',
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, #e6eaef 0px, #e6eaef 1px, transparent 1px, transparent 3px)',
        }}
      />

      <CornerBracket className="absolute top-6 left-6 h-10 w-10 text-graphite-700" />
      <CornerBracket className="absolute top-6 right-6 h-10 w-10 -scale-x-100 text-graphite-700" />
      <CornerBracket className="absolute bottom-6 left-6 h-10 w-10 -scale-y-100 text-graphite-700" />
      <CornerBracket className="absolute right-6 bottom-6 h-10 w-10 -scale-x-100 -scale-y-100 text-graphite-700" />

      <span className="absolute top-8 left-12 flex items-center gap-2 text-[11px] tracking-widest text-graphite-500">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-accent" />
        CAM 07
      </span>
      <span className="absolute top-8 right-12 text-[11px] tracking-widest text-graphite-500">
        CASE 001 — LA ÚLTIMA LLAMADA
      </span>

      <div className="relative flex flex-col items-center px-6 text-center">
        <div className="mb-6 h-px w-40 bg-gradient-to-r from-transparent via-amber-accent to-transparent" />
        <h1 className="text-5xl font-black tracking-tight text-graphite-100 sm:text-7xl">
          VERDICT<span className="text-graphite-500">:</span>
        </h1>
        <h1 className="text-5xl font-black tracking-tight text-amber-accent sm:text-7xl">
          UNSOLVED
        </h1>
        <p className="mt-6 text-sm tracking-widest text-graphite-400 uppercase">
          The case was closed. The truth wasn&apos;t.
        </p>
        <div className="mt-2 h-px w-40 bg-gradient-to-r from-transparent via-amber-accent to-transparent" />

        <button
          type="button"
          onClick={onEnter}
          className="mt-12 rounded border border-amber-accent px-8 py-3 text-sm font-semibold tracking-widest text-amber-accent uppercase transition-colors hover:bg-amber-accent hover:text-graphite-950"
        >
          New Investigation
        </button>
      </div>
    </div>
  );
}
