import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { CharacterHud } from '@/adventure/CharacterHud';
import { CharacterSchema } from '@/game-engine/scene-engine/schemas';

const STRINGS = {
  'character.director-gray.name': 'Director Gray',
  'character.wraith.name': 'Wraith',
  'capability.analisis': 'Análisis',
  'capability.hackeo': 'Hackeo',
  'capability.fuerza': 'Fuerza',
};

const GRAY = CharacterSchema.parse({
  id: 'director-gray',
  name: 'character.director-gray.name',
  portrait: null,
  color: '#6b7a8f',
  capabilities: ['analisis', 'hackeo'],
});

const WRAITH = CharacterSchema.parse({
  id: 'wraith',
  name: 'character.wraith.name',
  portrait: null,
  color: '#8f6b6b',
  capabilities: ['fuerza'],
});

function renderHud(overrides: Partial<Parameters<typeof CharacterHud>[0]> = {}) {
  const onSelect = vi.fn();
  render(
    <CharacterHud
      active={GRAY}
      available={[GRAY]}
      strings={STRINGS}
      gameId="verdict-unsolved"
      onSelect={onSelect}
      {...overrides}
    />,
  );
  return { onSelect };
}

describe('CharacterHud', () => {
  it('muestra el nombre y las capacidades del personaje activo', () => {
    renderHud();

    expect(screen.getByText('Director Gray')).toBeInTheDocument();
    expect(screen.getByText('Análisis · Hackeo')).toBeInTheDocument();
  });

  // Con un solo personaje, un selector de uno prometería una elección que no
  // existe.
  it('no ofrece selector con un solo personaje disponible', () => {
    renderHud({ available: [GRAY] });

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('ofrece cambiar a los otros disponibles', () => {
    const { onSelect } = renderHud({ available: [GRAY, WRAITH] });

    fireEvent.click(screen.getByRole('button', { name: 'Wraith' }));
    expect(onSelect).toHaveBeenCalledWith('wraith');
  });

  it('no se ofrece a sí mismo en el selector', () => {
    renderHud({ active: WRAITH, available: [GRAY, WRAITH] });

    expect(screen.queryByRole('button', { name: 'Wraith' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Director Gray' })).toBeInTheDocument();
  });
});
