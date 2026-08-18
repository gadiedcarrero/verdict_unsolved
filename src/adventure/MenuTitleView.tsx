import type { CSSProperties, JSX } from 'react';
import type { MenuPosition, MenuTitle } from '../game-engine/scene-engine/schemas';
import { FONT_FAMILY_CSS } from './fontFamilyCss';

/** Título alineado arriba, en la misma columna (izq/centro/der) que los botones. */
export const MENU_TITLE_POSITION_CLASSES: Record<MenuPosition, string> = {
  left: 'absolute top-16 left-16 text-left',
  center: 'absolute inset-x-0 top-16 text-center',
  right: 'absolute top-16 right-16 text-right',
};

export function MenuTitleView({ title, text }: { title: MenuTitle; text: string }): JSX.Element {
  const style: CSSProperties = {
    fontSize: `${title.fontSize}px`,
    color: title.color,
    letterSpacing: '0.05em',
    fontFamily: FONT_FAMILY_CSS[title.fontFamily],
  };
  return (
    <h1 className="font-black tracking-tight uppercase" style={style}>
      {text}
    </h1>
  );
}
