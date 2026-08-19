import { AdventureCaseBundleSchema } from './schemas';
import type { LoadAdventureCaseResult } from './types';

export function loadAdventureCase(rawBundle: unknown): LoadAdventureCaseResult {
  const result = AdventureCaseBundleSchema.safeParse(rawBundle);

  if (!result.success) {
    return {
      ok: false,
      error: result.error.issues
        .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
        .join('; '),
    };
  }

  // Los nodos de diálogo autogenerados por el editor viven dentro de cada
  // escena (ver Scene.dialogueNodes), pero en tiempo de ejecución todo el
  // motor de diálogo busca por id en un solo diccionario plano — se funden
  // acá, después de validar, junto con los del guion armado a mano.
  const dialogues = { ...result.data.dialogues };
  for (const scene of result.data.scenes) {
    Object.assign(dialogues, scene.dialogueNodes);
  }

  return { ok: true, data: { ...result.data, dialogues } };
}
