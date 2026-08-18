import { useState, type CSSProperties, type JSX } from 'react';
import type { MenuAppearance, MenuPosition } from '../game-engine/scene-engine/schemas';
import { FONT_FAMILY_CSS } from './fontFamilyCss';

/** Dónde se agrupa la pila de botones dentro del stage. */
export const MENU_POSITION_CLASSES: Record<MenuPosition, string> = {
  left: 'absolute left-16 top-1/2 flex -translate-y-1/2 flex-col items-start gap-3',
  center: 'absolute inset-0 flex flex-col items-center justify-center gap-3',
  right: 'absolute right-16 top-1/2 flex -translate-y-1/2 flex-col items-end gap-3',
};

/**
 * Un botón de menú, con 3 estilos posibles (definidos en `Scene.menuAppearance`,
 * compartido por todos los botones de la escena — no hay estilo por botón):
 * "bordered" (cuadrado con marco), "frameless" (solo texto) y "filled"
 * (relleno sólido). El color en reposo/hover viene de fontColor/hoverColor,
 * que son hex arbitrarios — por eso el hover se resuelve con estado local
 * en vez de una clase Tailwind `hover:`.
 */
export function MenuButtonView({
  label,
  appearance,
  onClick,
}: {
  label: string;
  appearance: MenuAppearance;
  onClick?: () => void;
}): JSX.Element {
  const [hovered, setHovered] = useState(false);
  const color = hovered ? appearance.hoverColor : appearance.fontColor;

  const baseStyle: CSSProperties = {
    fontSize: `${appearance.fontSize}px`,
    letterSpacing: '0.05em',
    transition: 'all 150ms ease-out',
    fontFamily: FONT_FAMILY_CSS[appearance.fontFamily],
  };

  const sharedProps = {
    type: 'button' as const,
    onClick,
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => setHovered(false),
  };

  if (appearance.buttonStyle === 'frameless') {
    return (
      <button
        {...sharedProps}
        style={{ ...baseStyle, color, textDecoration: hovered ? 'underline' : 'none' }}
        className="bg-transparent uppercase"
      >
        {label}
      </button>
    );
  }

  if (appearance.buttonStyle === 'filled') {
    return (
      <button
        {...sharedProps}
        style={{ ...baseStyle, backgroundColor: color, color: '#0b0f14' }}
        className="rounded px-8 py-3 uppercase"
      >
        {label}
      </button>
    );
  }

  // "bordered": cuadrado (sin redondear), marco y texto del mismo color.
  return (
    <button
      {...sharedProps}
      style={{ ...baseStyle, borderColor: color, color }}
      className="rounded-none border bg-transparent px-8 py-3 uppercase"
    >
      {label}
    </button>
  );
}
