import type { AdventureCaseState, VariableValue } from '@shared/save-data';
import type { Comparison, Condition } from './schemas';

/** Lo que una condición necesita saber del estado de la partida. Es un
 * subconjunto de `AdventureCaseState` a propósito: así el evaluador se puede
 * probar (y reusar desde el editor, que no tiene una partida en curso) sin
 * armar el estado entero del caso. */
export type ConditionContext = Pick<AdventureCaseState, 'flags' | 'variables'>;

export function conditionContextOf(state: AdventureCaseState): ConditionContext {
  return { flags: state.flags, variables: state.variables ?? {} };
}

function compare(actual: VariableValue | undefined, comparison: Comparison): boolean {
  const { op, value } = typeof comparison === 'object' ? comparison : ({ op: 'eq', value: comparison } as const);

  // Una variable que nunca se escribió no es igual, ni mayor, ni menor que
  // nada. Sí es "distinta de", que es lo que deja escribir la condición
  // natural "todavía no pasó esto" sin tener que inicializar la variable en
  // algún lado antes de que el guion la use.
  if (actual === undefined) return op === 'ne';

  switch (op) {
    case 'eq':
      return actual === value;
    case 'ne':
      return actual !== value;
    default:
      break;
  }

  // El resto son comparaciones de orden: solo tienen sentido entre números.
  // Con cualquier otra cosa la condición no se cumple, en vez de caer en las
  // comparaciones de JavaScript entre strings ('10' < '9') que darían una
  // respuesta que nadie quiso escribir.
  if (typeof actual !== 'number' || typeof value !== 'number') return false;
  switch (op) {
    case 'gt':
      return actual > value;
    case 'gte':
      return actual >= value;
    case 'lt':
      return actual < value;
    case 'lte':
      return actual <= value;
  }
}

/** Todos los términos tienen que cumplirse (AND). Una condición ausente o
 * vacía se cumple — así "sin condición" y "condición trivial" se comportan
 * igual y el editor no tiene que distinguirlas. */
export function evaluateCondition(condition: Condition | undefined, context: ConditionContext): boolean {
  if (!condition) return true;

  for (const flag of condition.flags) {
    if (!context.flags.includes(flag)) return false;
  }
  for (const flag of condition.notFlags) {
    if (context.flags.includes(flag)) return false;
  }
  for (const [name, comparison] of Object.entries(condition.variables)) {
    if (!compare(context.variables[name], comparison)) return false;
  }
  return true;
}
