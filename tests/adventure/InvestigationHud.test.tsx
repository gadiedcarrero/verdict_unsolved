import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { InvestigationHud } from '@/adventure/InvestigationHud';
import { InvestigationSchema } from '@/game-engine/scene-engine/schemas';

const STRINGS = {
  'investigation.objective': 'Objetivo actual',
  'investigation.clues': 'Pistas',
  'investigation.solve': 'Solucionar',
  'obj.lena': 'Comprueba si Lena está diciendo la verdad sobre Daniel.',
};

const INVESTIGATION = InvestigationSchema.parse({
  objective: 'obj.lena',
  clues: [
    { id: 'empleo', text: 'clue.empleo' },
    { id: 'pagos', text: 'clue.pagos' },
    { id: 'credencial', text: 'clue.credencial' },
  ],
});

function renderHud(overrides: Partial<Parameters<typeof InvestigationHud>[0]> = {}) {
  const onSolve = vi.fn();
  const onOpenClues = vi.fn();
  render(
    <InvestigationHud
      investigation={INVESTIGATION}
      discoveredClueIds={[]}
      strings={STRINGS}
      solved={false}
      canSolve={false}
      onSolve={onSolve}
      onOpenClues={onOpenClues}
      {...overrides}
    />,
  );
  return { onSolve, onOpenClues };
}

describe('InvestigationHud', () => {
  it('muestra el objetivo traducido', () => {
    renderHud();

    expect(
      screen.getByText('Comprueba si Lena está diciendo la verdad sobre Daniel.'),
    ).toBeInTheDocument();
  });

  it('cuenta solo las pistas de esta investigación', () => {
    renderHud({ discoveredClueIds: ['empleo', 'pagos', 'de-otra-escena'] });

    expect(screen.getByRole('button', { name: /Pistas\s*2\s*\/\s*3/ })).toBeInTheDocument();
  });

  // El contador es el acceso al panel: no hay un segundo botón "ver pistas".
  it('abre el panel de pistas desde el contador', () => {
    const { onOpenClues } = renderHud({ discoveredClueIds: ['empleo'] });

    fireEvent.click(screen.getByRole('button', { name: /Pistas/ }));
    expect(onOpenClues).toHaveBeenCalledOnce();
  });

  it('deja SOLUCIONAR visible pero deshabilitado mientras faltan pistas', () => {
    const { onSolve } = renderHud({ canSolve: false });

    const button = screen.getByRole('button', { name: /Solucionar/ });
    expect(button).toBeDisabled();

    fireEvent.click(button);
    expect(onSolve).not.toHaveBeenCalled();
  });

  it('habilita SOLUCIONAR con las pistas completas', () => {
    const { onSolve } = renderHud({
      discoveredClueIds: ['empleo', 'pagos', 'credencial'],
      canSolve: true,
    });

    fireEvent.click(screen.getByRole('button', { name: /Solucionar/ }));
    expect(onSolve).toHaveBeenCalledOnce();
  });

  // Ya resuelta, el botón no tiene nada que ofrecer: el objetivo sigue a la
  // vista porque la escena todavía se puede recorrer.
  it('esconde SOLUCIONAR cuando la investigación ya se resolvió', () => {
    renderHud({ solved: true, canSolve: false });

    expect(screen.queryByRole('button', { name: /Solucionar/ })).not.toBeInTheDocument();
    expect(
      screen.getByText('Comprueba si Lena está diciendo la verdad sobre Daniel.'),
    ).toBeInTheDocument();
  });
});
