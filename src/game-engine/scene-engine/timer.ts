import type { SceneTimer } from './schemas';

/**
 * Cuánto tiempo tiene realmente el jugador en una escena con reloj.
 *
 * Acá es donde una capacidad deja de ser una puerta abierta o cerrada y pasa
 * a mover un número: quien tiene respiración subacuática aguanta más que quien
 * no, en la misma escena y con la misma tarea. Una condición no puede expresar
 * eso — solo sabe responder sí o no.
 */
export function timerSecondsFor(timer: SceneTimer, capabilities: readonly string[]): number {
  let seconds = timer.seconds;
  for (const [capability, bonus] of Object.entries(timer.capabilityBonus)) {
    if (capabilities.includes(capability)) seconds += bonus;
  }
  // Un bonus negativo mal escrito no puede dejar la escena en cero segundos,
  // imposible de jugar y sin ninguna pista de por qué.
  return Math.max(1, seconds);
}

/** Los segundos que quedan, para mostrar. Nunca negativo: al llegar a cero el
 * reloj se detiene y lo que sigue lo decide `onExpire`. */
export function remainingSeconds(endsAt: number, now: number): number {
  return Math.max(0, Math.ceil((endsAt - now) / 1000));
}
