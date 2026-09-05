import { describe, expect, it } from 'vitest';
import { loadAdventureCase } from '@/game-engine/scene-engine/loadAdventureCase';

/**
 * Lo mínimo con lo que existe un juego. Este test es el contrato de "arrancar
 * un juego nuevo": si algún día vuelve a hacer falta un campo más, esto se
 * rompe acá en vez de aparecer como un error de validación al abrir el
 * proyecto — que era exactamente lo que pasaba cuando el bundle exigía los
 * cuatro archivos de sistemas de VERDICT (agentes, tienda, MIRROR).
 */
const MINIMAL_BUNDLE = {
  case: {
    id: 'juego-nuevo',
    title: 'Juego nuevo',
    startingSceneId: 'escena-1',
  },
  scenes: [
    {
      id: 'escena-1',
      act: 1,
      backgrounds: [{ id: 'bg-1', assetPath: 'backgrounds/escena-1.png' }],
    },
  ],
};

describe('bundle mínimo de un juego', () => {
  it('carga con solo case y scenes', () => {
    const result = loadAdventureCase(MINIMAL_BUNDLE);

    expect(result.ok).toBe(true);
  });

  it('rellena solo con los sistemas de VERDICT vacíos, sin pedirlos', () => {
    const result = loadAdventureCase(MINIMAL_BUNDLE);
    if (!result.ok) throw new Error(result.error);

    expect(result.data.agents).toEqual([]);
    expect(result.data.equipmentItems).toEqual([]);
    expect(result.data.investigationAreas).toEqual([]);
    expect(result.data.mirrorHints).toEqual([]);
    expect(result.data.characters).toEqual([]);
    expect(result.data.dialogues).toEqual({});
    expect(result.data.strings).toEqual({});
  });

  it('no exige cliente ni premisa, que son del planteo de VERDICT', () => {
    const result = loadAdventureCase(MINIMAL_BUNDLE);
    if (!result.ok) throw new Error(result.error);

    expect(result.data.case.clientName).toBe('');
    expect(result.data.case.premise).toBe('');
  });

  it('sigue exigiendo lo que define al juego', () => {
    expect(loadAdventureCase({ scenes: [] }).ok).toBe(false);
    expect(loadAdventureCase({ case: MINIMAL_BUNDLE.case }).ok).toBe(false);
  });
});
