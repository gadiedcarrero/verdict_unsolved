import { createContext, useContext, type JSX, type ReactNode } from 'react';
import type { CaseBundle } from '../game-engine/case-loader/schemas';

const CaseContext = createContext<CaseBundle | null>(null);

export function CaseProvider({
  bundle,
  children,
}: {
  bundle: CaseBundle;
  children: ReactNode;
}): JSX.Element {
  return <CaseContext.Provider value={bundle}>{children}</CaseContext.Provider>;
}

export function useCaseBundle(): CaseBundle {
  const bundle = useContext(CaseContext);
  if (!bundle) {
    throw new Error('useCaseBundle debe usarse dentro de un CaseProvider');
  }
  return bundle;
}
