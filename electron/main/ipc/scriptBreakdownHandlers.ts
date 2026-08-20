import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { app, ipcMain } from 'electron';
import type { ScriptBreakdown, ScriptBreakdownCharacter, ScriptBreakdownObject, ScriptBreakdownScene } from '../../../shared/script-breakdown';
import { getStoredAiIntegrationsConfig } from './aiIntegrationsHandlers';

const ID_PATTERN = /^[a-z0-9-]+$/;

function isValidId(value: unknown): value is string {
  return typeof value === 'string' && ID_PATTERN.test(value);
}

function scriptBreakdownFile(gameId: string): string {
  return `src/games/${gameId}/script-breakdown.json`;
}

function slugify(text: string): string {
  return (
    text
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'sin-id'
  );
}

const SYSTEM_PROMPT = `Sos parte del pipeline de producción de NarraDos, un motor de juegos de investigación tipo point-and-click. Tu tarea es el paso "guion → desglose legible por escena": leer un guion narrativo completo y devolver dos cosas en un único objeto JSON.

1. "characters": el roster de personajes que aparecen. Por cada uno: id (slug corto en minúsculas, sin espacios ni acentos), name (nombre tal como aparece en el guion), description (2-3 frases con lo esencial para dirigirlo visualmente: edad aproximada, rol, un rasgo físico o de vestuario si el texto lo da), suggestedColor (un color hex distintivo para usar en su nombre/diálogo, no repetir colores entre personajes).

2. "scenes": el guion partido en escenas jugables. Una escena no es necesariamente un capítulo — separá por cambios de locación o de situación dramática (ej: "la oficina de Gray" y "el edificio Halcyon" son escenas distintas aunque el capítulo sea uno solo). Si un capítulo mezcla varios saltos de tiempo o beats narrativos distintos en la misma locación (ej: "se contrata a dos agentes, se investiga una grabación, se descubre una pista" todo en la oficina), separalos en escenas propias igual — cada escena debe ser un único momento continuo, no un resumen de varias cosas. Por cada escena: id (slug), title (corto, descriptivo), summary (un párrafo legible en español describiendo qué pasa, para que un humano decida si la escena queda o se corta), bridgeFromPrevious (una línea corta, en tono de aviso de sistema/MIRROR, que conecta el final de la escena narrativa anterior con el arranque de esta — un salto de tiempo, quién llegó, qué cambió desde la última vez que se vio esa locación; null si esta escena continúa directo de la anterior sin salto, mismo momento y lugar, y no hace falta puente), characterIds (ids de los personajes presentes), objects (objetos o zonas con las que un jugador podría interactuar en esa escena: name, examineText con lo que se vería/diría al examinarlo, interactText con lo que pasa al interactuar — null si no aplica), minigame (null en la mayoría de los casos; solo si el momento narrativo describe una acción de habilidad/puzzle real -como sortear una cámara, decodificar un mensaje, abrir una cerradura, encontrar algo oculto- proponé {template, reason}: template es un nombre corto en inglés tipo "sequence" (memoria de secuencia, ya existe en el motor), "wiring", "lockpicking", "hidden-object", u otro nombre que describa el tipo de desafío si ninguno de esos encaja; reason es una frase explicando por qué esa escena lo pide).

Devolvé ÚNICAMENTE un objeto JSON válido con esta forma exacta, sin texto antes ni después, sin markdown:
{"characters": [{"id": "...", "name": "...", "description": "...", "suggestedColor": "#rrggbb"}], "scenes": [{"id": "...", "title": "...", "summary": "...", "bridgeFromPrevious": "..." , "characterIds": ["..."], "objects": [{"name": "...", "examineText": "..." , "interactText": "..."}], "minigame": {"template": "...", "reason": "..."} }]}`;

function coerceObjects(value: unknown): ScriptBreakdownObject[] {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => {
    const o = entry && typeof entry === 'object' ? (entry as Record<string, unknown>) : {};
    return {
      name: typeof o['name'] === 'string' ? o['name'] : 'objeto',
      examineText: typeof o['examineText'] === 'string' ? o['examineText'] : null,
      interactText: typeof o['interactText'] === 'string' ? o['interactText'] : null,
    };
  });
}

function coerceCharacters(value: unknown, usedIds: Set<string>): ScriptBreakdownCharacter[] {
  if (!Array.isArray(value)) return [];
  return value.map((entry, index) => {
    const c = entry && typeof entry === 'object' ? (entry as Record<string, unknown>) : {};
    const name = typeof c['name'] === 'string' && c['name'] ? c['name'] : `Personaje ${index + 1}`;
    let id = typeof c['id'] === 'string' && c['id'] ? slugify(c['id']) : slugify(name);
    while (usedIds.has(id)) id = `${id}-2`;
    usedIds.add(id);
    return {
      id,
      name,
      description: typeof c['description'] === 'string' ? c['description'] : '',
      suggestedColor: typeof c['suggestedColor'] === 'string' ? c['suggestedColor'] : '#8fa3c9',
    };
  });
}

function coerceScenes(value: unknown, usedIds: Set<string>): ScriptBreakdownScene[] {
  if (!Array.isArray(value)) return [];
  return value.map((entry, index) => {
    const s = entry && typeof entry === 'object' ? (entry as Record<string, unknown>) : {};
    const title = typeof s['title'] === 'string' && s['title'] ? s['title'] : `Escena ${index + 1}`;
    let id = typeof s['id'] === 'string' && s['id'] ? slugify(s['id']) : slugify(title);
    while (usedIds.has(id)) id = `${id}-2`;
    usedIds.add(id);
    const minigameRaw = s['minigame'];
    const minigameObj = minigameRaw && typeof minigameRaw === 'object' ? (minigameRaw as Record<string, unknown>) : null;
    const minigame =
      minigameObj && typeof minigameObj['template'] === 'string' && typeof minigameObj['reason'] === 'string'
        ? { template: minigameObj['template'], reason: minigameObj['reason'] }
        : null;
    const reviewStatus =
      s['reviewStatus'] === 'approved' || s['reviewStatus'] === 'cut' ? s['reviewStatus'] : 'pending';
    return {
      id,
      title,
      summary: typeof s['summary'] === 'string' ? s['summary'] : '',
      bridgeFromPrevious: typeof s['bridgeFromPrevious'] === 'string' && s['bridgeFromPrevious'] ? s['bridgeFromPrevious'] : null,
      characterIds: Array.isArray(s['characterIds']) ? s['characterIds'].filter((x): x is string => typeof x === 'string') : [],
      objects: coerceObjects(s['objects']),
      minigame,
      reviewStatus,
    };
  });
}

/** La API de OpenAI no garantiza que respete los nombres de campo pedidos en
 * el prompt al pie de la letra — se corrigen acá defaults/formas raras en vez
 * de rechazar toda la respuesta y perder el trabajo de la llamada. */
function coerceScriptBreakdown(raw: unknown): ScriptBreakdown {
  const obj = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const usedCharacterIds = new Set<string>();
  const usedSceneIds = new Set<string>();
  return {
    generatedAt: typeof obj['generatedAt'] === 'string' ? obj['generatedAt'] : new Date().toISOString(),
    characters: coerceCharacters(obj['characters'], usedCharacterIds),
    scenes: coerceScenes(obj['scenes'], usedSceneIds),
  };
}

export function registerScriptBreakdownHandlers(): void {
  ipcMain.handle('script-breakdown:generate', async (_event, scriptText: unknown) => {
    if (typeof scriptText !== 'string' || scriptText.trim().length < 20) {
      return { ok: false, error: 'Pegá el guion completo antes de generar.' };
    }
    const config = await getStoredAiIntegrationsConfig();
    if (!config.openaiApiKey) {
      return { ok: false, error: 'Falta la API key de OpenAI en Ajustes → Integraciones IA.' };
    }
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.openaiApiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4.1',
          temperature: 0.4,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: scriptText },
          ],
        }),
      });
      if (!response.ok) {
        const errorBody = await response.text();
        return { ok: false, error: `OpenAI devolvió un error (${response.status}): ${errorBody.slice(0, 500)}` };
      }
      const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        return { ok: false, error: 'OpenAI no devolvió contenido.' };
      }
      const parsed: unknown = JSON.parse(content);
      const breakdown = coerceScriptBreakdown(parsed);
      return { ok: true, breakdown };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle('script-breakdown:save', async (_event, gameId: unknown, breakdown: unknown) => {
    if (app.isPackaged) {
      return { ok: false, error: 'El editor visual solo funciona corriendo "pnpm dev".' };
    }
    if (!isValidId(gameId)) {
      return { ok: false, error: `Id de juego inválido: ${String(gameId)}` };
    }
    try {
      const filePath = join(app.getAppPath(), scriptBreakdownFile(gameId));
      await mkdir(join(app.getAppPath(), `src/games/${gameId}`), { recursive: true });
      await writeFile(filePath, `${JSON.stringify(breakdown, null, 2)}\n`, 'utf-8');
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle('script-breakdown:read', async (_event, gameId: unknown) => {
    if (!isValidId(gameId)) {
      return { ok: false, error: `Id de juego inválido: ${String(gameId)}` };
    }
    try {
      const filePath = join(app.getAppPath(), scriptBreakdownFile(gameId));
      const raw = await readFile(filePath, 'utf-8');
      const parsed: unknown = JSON.parse(raw);
      return { ok: true, breakdown: coerceScriptBreakdown(parsed) };
    } catch {
      return { ok: true, breakdown: null };
    }
  });
}
