import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { DeleteGameDialog } from '@/app/DeleteGameDialog';

function renderDialog(overrides: Partial<Parameters<typeof DeleteGameDialog>[0]> = {}) {
  const onDelete = vi.fn().mockResolvedValue({ ok: true });
  const onClose = vi.fn();
  render(
    <DeleteGameDialog
      gameId="verdict-unsolved"
      title="VERDICT: UNSOLVED"
      sceneCount={4}
      characterCount={18}
      onDelete={onDelete}
      onClose={onClose}
      {...overrides}
    />,
  );
  return { onDelete, onClose };
}

function borrar() {
  return screen.getByRole('button', { name: 'Borrar' });
}

describe('DeleteGameDialog', () => {
  it('dice qué se va a perder', () => {
    renderDialog();

    expect(screen.getByText(/4 escenas y 18 personajes/)).toBeInTheDocument();
    expect(screen.getByText(/src\/games\/verdict-unsolved/)).toBeInTheDocument();
  });

  // La fricción es el punto: sin escribir el id no se puede borrar, para que
  // el error de equivocarse de proyecto no pase de largo.
  it('no deja borrar hasta escribir el id exacto', () => {
    const { onDelete } = renderDialog();

    expect(borrar()).toBeDisabled();

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'verdict' } });
    expect(borrar()).toBeDisabled();

    fireEvent.click(borrar());
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('borra cuando el id coincide', () => {
    const { onDelete } = renderDialog();

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'verdict-unsolved' } });
    fireEvent.click(borrar());

    expect(onDelete).toHaveBeenCalledOnce();
  });

  it('no confunde un id parecido con el correcto', () => {
    const { onDelete } = renderDialog();

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'verdict-unsolved-2' } });
    fireEvent.click(borrar());

    expect(onDelete).not.toHaveBeenCalled();
  });

  it('avisa que en disco no se deshace', () => {
    renderDialog();

    expect(screen.getByText(/no se puede deshacer/i)).toBeInTheDocument();
  });

  // Un proyecto que no carga es justamente uno que se quiere sacar de encima:
  // no poder contar lo que tiene no puede impedir borrarlo.
  it('se puede borrar un proyecto roto, sin contar lo que tiene', () => {
    const { onDelete } = renderDialog({ sceneCount: null, characterCount: null });

    expect(screen.queryByText(/escenas y/)).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'verdict-unsolved' } });
    fireEvent.click(borrar());
    expect(onDelete).toHaveBeenCalledOnce();
  });

  it('se puede cancelar', () => {
    const { onClose, onDelete } = renderDialog();

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(onDelete).not.toHaveBeenCalled();
  });
});
