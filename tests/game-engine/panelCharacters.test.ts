import { describe, expect, it } from 'vitest';
import type { ScriptBreakdownCharacter } from '@shared/script-breakdown';
import { resolvePanelCharacterIds } from '@/game-engine/scene-engine/panelCharacters';

function character(
  id: string,
  name: string,
  alternateLooks: { key: string; label: string }[] = [],
): ScriptBreakdownCharacter {
  return {
    id,
    name,
    description: '',
    suggestedColor: '#ffffff',
    alternateLooks: alternateLooks.map((look) => ({ ...look, description: '' })),
  };
}

/** El roster real que el desglose sacó del guion de VERDICT. */
const ROSTER = [
  character('gray', 'Director Gray', [
    { key: 'adrian', label: 'Adrian Cross' },
    { key: 'wraith', label: 'Wraith' },
  ]),
  character('evelyn', 'Evelyn Marlowe', [{ key: 'iris', label: 'Iris' }]),
  character('june', 'June Sato'),
  character('theo', 'Theo Kade'),
  character('marcus', 'Marcus Wynn'),
  character('lena', 'Lena Hart'),
  character('daniel', 'Daniel Hart'),
];

describe('resolvePanelCharacterIds', () => {
  it('empareja el nombre de pila contra el nombre completo del roster', () => {
    expect(resolvePanelCharacterIds(['Evelyn', 'Theo', 'Marcus', 'June'], ROSTER)).toEqual([
      'evelyn',
      'theo',
      'marcus',
      'june',
    ]);
  });

  // El caso que fallaba: Adrian es el protagonista y aparece en media
  // historia, pero no existe como personaje de primer nivel — es una
  // identidad de "gray". Sin esto, sus paneles se generaban sin referencia.
  it('empareja una identidad alternativa con su propio id', () => {
    expect(resolvePanelCharacterIds(['Adrian'], ROSTER)).toEqual(['adrian']);
    expect(resolvePanelCharacterIds(['Wraith'], ROSTER)).toEqual(['wraith']);
    expect(resolvePanelCharacterIds(['Iris'], ROSTER)).toEqual(['iris']);
  });

  it('resuelve el panel completo de la escena 1 del guion', () => {
    expect(resolvePanelCharacterIds(['Adrian', 'Evelyn', 'Theo', 'Marcus', 'June'], ROSTER)).toEqual([
      'adrian',
      'evelyn',
      'theo',
      'marcus',
      'june',
    ]);
  });

  // Poner la cara equivocada es peor que no poner ninguna.
  it('no elige cuando el nombre es ambiguo', () => {
    expect(resolvePanelCharacterIds(['Hart'], ROSTER)).toEqual([]);
  });

  it('empareja el apellido cuando solo hay un candidato', () => {
    expect(resolvePanelCharacterIds(['Marlowe'], ROSTER)).toEqual(['evelyn']);
  });

  // Con `includes` a secas, "Ana" matcheaba "Susana".
  it('no empareja un nombre que solo está contenido dentro de otro', () => {
    expect(resolvePanelCharacterIds(['Ana'], [character('susana', 'Susana Ortiz')])).toEqual([]);
  });

  it('ignora acentos y mayúsculas', () => {
    expect(resolvePanelCharacterIds(['june sato', 'THEO'], ROSTER)).toEqual(['june', 'theo']);
  });

  it('no repite un personaje nombrado dos veces', () => {
    expect(resolvePanelCharacterIds(['Theo', 'Theo Kade'], ROSTER)).toEqual(['theo']);
  });

  it('no devuelve nada para un panel sin personajes', () => {
    expect(resolvePanelCharacterIds([], ROSTER)).toEqual([]);
    expect(resolvePanelCharacterIds(['Alguien que no existe'], ROSTER)).toEqual([]);
  });
});
