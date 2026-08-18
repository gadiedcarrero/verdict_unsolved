import type { JSX } from 'react';
import type { HotspotVerbIcon } from '../game-engine/scene-engine/schemas';

/** Trazos de cada ícono, dibujados a mano en un viewBox 24x24 — sin
 * dependencias externas, coherente con el resto de los SVG inline del
 * proyecto (ver CornerBracket en SplashScreen). */
const ICON_PATHS: Record<HotspotVerbIcon, JSX.Element> = {
  eye: (
    <>
      <path d="M2 12c2.5-5 7-8 10-8s7.5 3 10 8c-2.5 5-7 8-10 8s-7.5-3-10-8Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  hand: (
    <path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V12M11 12V4a1.5 1.5 0 0 1 3 0v8M14 12V5.5a1.5 1.5 0 0 1 3 0V13M17 8.5a1.5 1.5 0 0 1 3 0V15c0 4-2.5 6.5-6 6.5H12c-3 0-4-1-5.5-3.5L4 13.5c-.6-1 0-2.2 1.2-2.2.5 0 1 .2 1.3.6L8 14" />
  ),
  chat: (
    <path d="M4 5h16v11H9l-4 4v-4H4Z M8 9.5h8 M8 12.5h5" />
  ),
  bag: (
    <path d="M6 8h12l-1 12H7Z M9 8a3 3 0 0 1 6 0" />
  ),
  gear: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2.5M12 18.5V21M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M3 12h2.5M18.5 12H21M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" />
    </>
  ),
};

export function VerbIcon({ icon, className }: { icon: HotspotVerbIcon; className?: string }): JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {ICON_PATHS[icon]}
    </svg>
  );
}
