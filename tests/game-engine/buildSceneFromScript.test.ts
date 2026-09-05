import { describe, expect, it } from 'vitest';
import type { ParsedScene } from '@shared/parsed-scene';
import { buildSceneFromScript } from '@/game-engine/scene-engine/buildSceneFromScript';
import { canSolve } from '@/game-engine/scene-engine/investigation';
import { evaluateCondition } from '@/game-engine/scene-engine/conditions';

/** La escena 4 del guion ("¿QUIÉN ES DANIEL HART?"), tal como saldría del
 * desglose: objetivo, tres pistas repartidas en dos imágenes y la deducción. */
const ESCENA_4: ParsedScene = {
  title: '¿Quién es Daniel Hart?',
  characterId: 'director-gray',
  objective: 'Comprueba si Lena está diciendo la verdad sobre Daniel.',
  images: [
    {
      title: 'Ficha de Daniel',
      hotspots: [
        { name: 'Historial laboral', kind: 'navigate', targetImage: 'Historial laboral' },
        {
          name: 'Registros financieros',
          kind: 'clue',
          clue: 'Daniel seguía recibiendo dinero de una empresa vinculada a Acheron.',
        },
        { name: 'Actividad digital', kind: 'info', text: 'Nada fuera de lo común.' },
      ],
    },
    {
      title: 'Historial laboral',
      hotspots: [
        {
          name: 'Acheron Systems',
          kind: 'clue',
          clue: 'Daniel trabajó como ingeniero de seguridad para Acheron.',
        },
        {
          name: 'Credencial',
          kind: 'clue',
          clue: 'Daniel conservaba una credencial de seguridad de Acheron.',
          globalClue: true,
        },
      ],
    },
  ],
  deduction: {
    question: '¿Qué demuestran las evidencias?',
    answers: [
      'Daniel estaba investigando Acheron como periodista.',
      'Lena ocultó la verdadera relación de Daniel con Acheron.',
      'Daniel nunca trabajó para Acheron.',
    ],
    correctIndex: 1,
  },
};

function build(parsed: ParsedScene = ESCENA_4) {
  return buildSceneFromScript(parsed, 'escena-4');
}

describe('buildSceneFromScript', () => {
  it('produce una escena que valida contra el schema del motor', () => {
    const { scene } = build();

    expect(scene.id).toBe('escena-4');
    expect(scene.backgrounds).toHaveLength(2);
    expect(scene.activeCharacterId).toBe('director-gray');
  });

  it('saca todo texto visible a claves de traducción', () => {
    const { scene, strings } = build();

    const hotspot = scene.backgrounds[0]!.hotspots[0]!;
    expect(hotspot.label).toBe('hotspot.escena-4.historial-laboral');
    expect(strings['hotspot.escena-4.historial-laboral']).toBe('Historial laboral');
    expect(strings['objective.escena-4']).toBe(
      'Comprueba si Lena está diciendo la verdad sobre Daniel.',
    );
  });

  it('junta las pistas de todas las imágenes en la investigación de la escena', () => {
    const { scene } = build();

    expect(scene.investigation?.clues.map((clue) => clue.id)).toEqual([
      'registros-financieros',
      'acheron-systems',
      'credencial',
    ]);
  });

  it('conecta cada zona de pista con su acción de descubrirla', () => {
    const { scene } = build();

    const registros = scene.backgrounds[0]!.hotspots[1]!;
    expect(registros.onInteract).toContainEqual({
      type: 'discoverClue',
      clueId: 'registros-financieros',
    });
  });

  it('marca como global la pista que el guion señala', () => {
    const { scene } = build();

    const credencial = scene.investigation?.clues.find((clue) => clue.id === 'credencial');
    expect(credencial?.global).toBe(true);
    expect(scene.investigation?.clues.find((clue) => clue.id === 'acheron-systems')?.global).toBe(
      false,
    );
  });

  it('resuelve la navegación a un primer plano contra el fondo correcto', () => {
    const { scene } = build();

    const historial = scene.backgrounds[0]!.hotspots[0]!;
    expect(historial.onInteract).toContainEqual({ type: 'setBackground', backgroundId: 'bg-2' });
  });

  it('arma la deducción con la respuesta correcta que marca el guion', () => {
    const { scene, strings } = build();
    const deduction = scene.investigation?.deduction;

    expect(deduction?.correctAnswerId).toBe('r2');
    expect(strings[`deduction.escena-4.${deduction!.correctAnswerId}`]).toBe(
      'Lena ocultó la verdadera relación de Daniel con Acheron.',
    );
  });

  it('deja la escena resoluble justo al juntar sus tres pistas', () => {
    const { scene } = build();
    const investigation = scene.investigation!;

    expect(canSolve(investigation, ['registros-financieros', 'acheron-systems'])).toBe(false);
    expect(
      canSolve(investigation, ['registros-financieros', 'acheron-systems', 'credencial']),
    ).toBe(true);
  });

  it('convierte una zona con capacidad requerida en una condición del motor', () => {
    const { scene, strings } = buildSceneFromScript(
      {
        title: 'Vestíbulo',
        images: [
          {
            title: 'Vestíbulo',
            hotspots: [
              {
                name: 'Caja',
                kind: 'action',
                requiredCapabilities: ['fuerza'],
                blockedText: 'No puedo mover esto desde la silla.',
              },
            ],
          },
        ],
      },
      'escena-8',
    );

    const caja = scene.backgrounds[0]!.hotspots[0]!;
    expect(
      evaluateCondition(caja.enabledWhen, {
        flags: [],
        variables: {},
        activeCharacterId: 'wraith',
        capabilities: ['fuerza'],
      }),
    ).toBe(true);
    expect(
      evaluateCondition(caja.enabledWhen, {
        flags: [],
        variables: {},
        activeCharacterId: 'director-gray',
        capabilities: ['analisis'],
      }),
    ).toBe(false);
    expect(strings[caja.disabledMessage!]).toBe('No puedo mover esto desde la silla.');
  });

  it('no arma investigación en una escena sin objetivo', () => {
    const { scene } = buildSceneFromScript({ title: 'Cinemática', images: [] }, 'escena-1');

    expect(scene.investigation).toBeUndefined();
  });

  // Una escena sin imágenes no tendría dónde poner nada y el motor no la
  // podría mostrar.
  it('siempre deja al menos un fondo', () => {
    const { scene } = buildSceneFromScript({ title: 'Vacía', images: [] }, 'escena-x');

    expect(scene.backgrounds).toHaveLength(1);
    expect(scene.backgrounds[0]!.assetPath).toBe('backgrounds/escena-x-1.png');
  });

  it('no repite ids entre zonas que el guion llama igual', () => {
    const { scene } = buildSceneFromScript(
      {
        title: 'Repetidas',
        images: [
          {
            title: 'A',
            hotspots: [
              { name: 'Puerta', kind: 'info' },
              { name: 'Puerta', kind: 'info' },
            ],
          },
        ],
      },
      'escena-r',
    );

    const ids = scene.backgrounds[0]!.hotspots.map((hotspot) => hotspot.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('reparte las zonas sin superponerlas', () => {
    const { scene } = build();

    const areas = scene.backgrounds[0]!.hotspots.map((hotspot) => hotspot.area);
    for (let i = 0; i < areas.length; i += 1) {
      for (let j = i + 1; j < areas.length; j += 1) {
        const a = areas[i]!;
        const b = areas[j]!;
        const overlaps =
          a.x < b.x + b.width &&
          b.x < a.x + a.width &&
          a.y < b.y + b.height &&
          b.y < a.y + a.height;
        expect(overlaps).toBe(false);
      }
    }
  });
});
