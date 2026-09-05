import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { CluePanel } from '@/adventure/CluePanel';
import { ClueSchema, InvestigationSchema } from '@/game-engine/scene-engine/schemas';

const STRINGS = {
  'clues.title': 'Pistas del caso',
  'clues.pending': 'Sin descubrir',
  'clues.evidence': 'Evidencia del caso',
  'clues.close': 'Cerrar',
  'clue.empleo': 'Daniel trabajó como ingeniero de seguridad para Acheron.',
  'clue.pagos': 'Daniel seguía recibiendo dinero de una empresa vinculada a Acheron.',
  'clue.credencial': 'Daniel conservaba una credencial de seguridad de Acheron.',
  'clue.deciden': 'Ellos saben cómo decide la gente.',
};

const INVESTIGATION = InvestigationSchema.parse({
  objective: 'obj.lena',
  clues: [
    { id: 'empleo', text: 'clue.empleo' },
    { id: 'pagos', text: 'clue.pagos' },
    { id: 'credencial', text: 'clue.credencial' },
  ],
});

function renderPanel(overrides: Partial<Parameters<typeof CluePanel>[0]> = {}) {
  const onClose = vi.fn();
  render(
    <CluePanel
      investigation={INVESTIGATION}
      discoveredClueIds={[]}
      globalEvidence={[]}
      strings={STRINGS}
      onClose={onClose}
      {...overrides}
    />,
  );
  return { onClose };
}

describe('CluePanel', () => {
  it('lista las pistas descubiertas con su texto', () => {
    renderPanel({ discoveredClueIds: ['empleo', 'pagos'] });

    expect(
      screen.getByText('Daniel trabajó como ingeniero de seguridad para Acheron.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Daniel seguía recibiendo dinero de una empresa vinculada a Acheron.'),
    ).toBeInTheDocument();
  });

  // Los huecos dicen cuántas faltan sin decir cuáles: el jugador tiene que
  // volver a la escena a buscarlas, no deducirlas desde este panel.
  it('muestra un hueco por cada pista que falta, sin revelar su contenido', () => {
    renderPanel({ discoveredClueIds: ['empleo'] });

    expect(screen.getAllByTestId('clue-pending')).toHaveLength(2);
    expect(
      screen.queryByText('Daniel conservaba una credencial de seguridad de Acheron.'),
    ).not.toBeInTheDocument();
  });

  it('no deja huecos cuando están todas', () => {
    renderPanel({ discoveredClueIds: ['empleo', 'pagos', 'credencial'] });

    expect(screen.queryAllByTestId('clue-pending')).toHaveLength(0);
  });

  it('no cuenta como propias las pistas de otras escenas', () => {
    renderPanel({ discoveredClueIds: ['de-otra-escena'] });

    expect(screen.getAllByTestId('clue-pending')).toHaveLength(3);
  });

  it('muestra la evidencia global en su propia sección', () => {
    renderPanel({
      discoveredClueIds: ['empleo'],
      globalEvidence: [ClueSchema.parse({ id: 'deciden', text: 'clue.deciden', global: true })],
    });

    expect(screen.getByText('Evidencia del caso')).toBeInTheDocument();
    expect(screen.getByText('Ellos saben cómo decide la gente.')).toBeInTheDocument();
  });

  it('esconde la sección de evidencia cuando todavía no hay ninguna', () => {
    renderPanel({ discoveredClueIds: ['empleo'] });

    expect(screen.queryByText('Evidencia del caso')).not.toBeInTheDocument();
  });

  it('se cierra', () => {
    const { onClose } = renderPanel();

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
