import { describe, expect, it } from 'vitest';
import { inventoryItems, itemById } from '@/game-engine/scene-engine/inventory';
import { evaluateCondition } from '@/game-engine/scene-engine/conditions';
import { ConditionSchema, SceneSchema, type Scene } from '@/game-engine/scene-engine/schemas';

/** La escena 8 del guion: la tarjeta se consigue en la oficina de seguridad y
 * se usa en la puerta de mantenimiento, que está en otra parte del edificio. */
const OFICINA: Scene = SceneSchema.parse({
  id: 'escena-8',
  act: 1,
  backgrounds: [{ id: 'bg-1', assetPath: 'backgrounds/x.png' }],
  items: [
    { id: 'tarjeta-mantenimiento', name: 'item.tarjeta' },
    { id: 'linterna', name: 'item.linterna', icon: 'items/linterna.png' },
  ],
});

const CORREDOR: Scene = SceneSchema.parse({
  id: 'escena-8b',
  act: 1,
  backgrounds: [{ id: 'bg-1', assetPath: 'backgrounds/y.png' }],
});

const SCENES = [OFICINA, CORREDOR];

function context(inventoryItemIds: string[]) {
  return {
    flags: [],
    variables: {},
    activeCharacterId: 'wraith',
    inventoryItemIds,
    capabilities: [],
  };
}

describe('itemById', () => {
  it('encuentra un objeto definido en cualquier escena', () => {
    expect(itemById(SCENES, 'tarjeta-mantenimiento')?.name).toBe('item.tarjeta');
  });

  it('devuelve null para un id que no existe', () => {
    expect(itemById(SCENES, 'inventado')).toBeNull();
  });
});

describe('inventoryItems', () => {
  it('resuelve lo que se lleva, en el orden en que se consiguió', () => {
    const items = inventoryItems(SCENES, ['linterna', 'tarjeta-mantenimiento']);

    expect(items.map((item) => item.id)).toEqual(['linterna', 'tarjeta-mantenimiento']);
  });

  // Perder un icono es mejor que perder la pantalla: si la escena que definía
  // el objeto se borró, el inventario sigue funcionando sin él.
  it('saltea un id sin definición en vez de romper', () => {
    const items = inventoryItems(SCENES, ['tarjeta-mantenimiento', 'de-una-escena-borrada']);

    expect(items.map((item) => item.id)).toEqual(['tarjeta-mantenimiento']);
  });

  it('no inventa nada con el inventario vacío', () => {
    expect(inventoryItems(SCENES, [])).toEqual([]);
  });
});

describe('la puerta que pide la tarjeta', () => {
  const puerta = ConditionSchema.parse({ items: ['tarjeta-mantenimiento'] });

  it('no responde sin el objeto', () => {
    expect(evaluateCondition(puerta, context([]))).toBe(false);
  });

  it('responde con el objeto encima', () => {
    expect(evaluateCondition(puerta, context(['tarjeta-mantenimiento']))).toBe(true);
  });

  it('no se conforma con otro objeto cualquiera', () => {
    expect(evaluateCondition(puerta, context(['linterna']))).toBe(false);
  });

  it('exige todos los objetos cuando pide varios', () => {
    const dosCosas = ConditionSchema.parse({ items: ['tarjeta-mantenimiento', 'linterna'] });

    expect(evaluateCondition(dosCosas, context(['tarjeta-mantenimiento']))).toBe(false);
    expect(evaluateCondition(dosCosas, context(['tarjeta-mantenimiento', 'linterna']))).toBe(true);
  });

  // Un objeto que se consume: la puerta deja de abrirse una vez usado.
  it('deja de cumplirse si el objeto se consumió', () => {
    const despuesDeUsarla = context(['tarjeta-mantenimiento']).inventoryItemIds.filter(
      (id) => id !== 'tarjeta-mantenimiento',
    );

    expect(evaluateCondition(puerta, context(despuesDeUsarla))).toBe(false);
  });
});
