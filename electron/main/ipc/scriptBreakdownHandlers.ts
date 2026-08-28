import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { app, ipcMain } from 'electron';
import type {
  NarrativePurpose,
  ScriptBreakdown,
  ScriptBreakdownAlternateLook,
  ScriptBreakdownCharacter,
  ScriptBreakdownObject,
  ScriptBreakdownPanel,
  ScriptBreakdownScene,
} from '../../../shared/script-breakdown';
import { formatApiError } from './apiErrors';
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

1. "characters": el roster de personajes que aparecen. Por cada uno: id (slug corto en minúsculas, sin espacios ni acentos), name (nombre tal como aparece en el guion), description (2-3 frases con lo esencial para dirigirlo visualmente: edad aproximada, rol, un rasgo físico o de vestuario si el texto lo da), suggestedColor (un color hex distintivo para usar en su nombre/diálogo, no repetir colores entre personajes), alternateLooks (array, vacío en la gran mayoría de los casos). **Importante:** si un personaje tiene una identidad secreta, disfraz o alias con apariencia CLARAMENTE distinta a la suya (ej: el mismo personaje aparece en el guion también como otra persona enmascarada, en otro cuerpo, con otro nombre operativo — como Adrian Cross que también es "Director Gray" en silla de ruedas y el agente enmascarado "Wraith"), NO mezcles esas apariencias en una sola descripción — eso arruina la generación de imagen después. En vez de eso: "description" queda con SOLO la apariencia base/neutral del personaje (nunca mencionar el disfraz ahí), y cada identidad alternativa va como una entrada aparte en "alternateLooks": [{key: slug corto, label: nombre de esa identidad tal como aparece en el guion, description: apariencia de ESA identidad nada más, autocontenida — no digas "como antes pero con máscara", describí el look completo de cero}]. **"description" y cada "description" de "alternateLooks" tienen que ser PURAMENTE visuales** (lo que se ve: cuerpo, cara, ropa, postura) — este texto se manda directo a un generador de imagen. No incluyas rasgos que no se puedan dibujar: voz (modulada, distorsionada, grave...), personalidad, forma de hablar, sonidos. Si el guion menciona algo así, dejalo afuera de la descripción visual — no hay dónde guardarlo todavía en este paso del pipeline.

2. "scenes": el guion partido en escenas jugables. Una escena no es necesariamente un capítulo — separá por cambios de locación o de situación dramática (ej: "la oficina de Gray" y "el edificio Halcyon" son escenas distintas aunque el capítulo sea uno solo). Si un capítulo mezcla varios saltos de tiempo o beats narrativos distintos en la misma locación (ej: "se contrata a dos agentes, se investiga una grabación, se descubre una pista" todo en la oficina), separalos en escenas propias igual — cada escena debe ser un único momento continuo, no un resumen de varias cosas. Por cada escena: id (slug), title (corto, descriptivo), summary (un párrafo legible en español describiendo qué pasa, para que un humano decida si la escena queda o se corta), sourceTextStart (las primeras 8-12 palabras de esta escena en el guion original, copiadas EXACTAMENTE letra por letra — no resumas ni parafrasees, es una marca de posición que el código usa para encontrar dónde empieza esta escena en el texto que te pasaron), sourceTextEnd (las últimas 8-12 palabras de esta escena, copiadas EXACTAMENTE igual, marca de dónde termina), bridgeFromPrevious (una línea corta, en tono de aviso de sistema/MIRROR, que conecta el final de la escena narrativa anterior con el arranque de esta — un salto de tiempo, quién llegó, qué cambió desde la última vez que se vio esa locación; null si esta escena continúa directo de la anterior sin salto, mismo momento y lugar, y no hace falta puente), characterIds (ids de los personajes presentes), objects (objetos o zonas con las que un jugador podría interactuar en esa escena: name, examineText con lo que se vería/diría al examinarlo, interactText con lo que pasa al interactuar — null si no aplica), minigame (null en la mayoría de los casos; solo si el momento narrativo describe una acción de habilidad/puzzle real -como sortear una cámara, decodificar un mensaje, abrir una cerradura, encontrar algo oculto- proponé {template, reason}: template es un nombre corto en inglés tipo "sequence" (memoria de secuencia, ya existe en el motor), "wiring", "lockpicking", "hidden-object", u otro nombre que describa el tipo de desafío si ninguno de esos encaja; reason es una frase explicando por qué esa escena lo pide).

**Importante sobre sourceTextStart/sourceTextEnd:** NO copies el texto completo de la escena en ningún campo — solo esos dos fragmentos cortos (8-12 palabras cada uno), letra por letra, sin cambiar comillas, guiones ni puntuación. El código arma el texto completo de cada escena buscando esas dos marcas en el guion original, así que si no coinciden exactamente con el texto real, esa escena se queda sin desglose en paneles después.

**Importante sobre cobertura completa:** el guion que te paso puede ser largo — varios capítulos pegados uno atrás del otro. Tenés que procesarlo ENTERO, de la primera palabra a la última, sin importar cuántas escenas hagan falta. Nunca pares de generar escenas antes de llegar al final del texto que te dieron, ni resumas los capítulos finales en una sola escena para terminar rápido — cada escena real del guion tiene que tener la suya, hasta la última línea del documento. Como ahora solo copiás fragmentos cortos por escena (no el texto completo), cubrir un guion largo entero no debería quedarse sin espacio de respuesta.

Devolvé ÚNICAMENTE un objeto JSON válido con esta forma exacta, sin texto antes ni después, sin markdown:
{"characters": [{"id": "...", "name": "...", "description": "...", "suggestedColor": "#rrggbb", "alternateLooks": [{"key": "...", "label": "...", "description": "..."}]}], "scenes": [{"id": "...", "title": "...", "summary": "...", "sourceTextStart": "...", "sourceTextEnd": "...", "bridgeFromPrevious": "..." , "characterIds": ["..."], "objects": [{"name": "...", "examineText": "..." , "interactText": "..."}], "minigame": {"template": "...", "reason": "..."} }]}`;

// Segundo paso, uno por escena (no en la misma llamada que arriba — el
// texto de UNA escena entera cabe cómodo en una sola llamada enfocada;
// pedirle a un solo llamado que corte TODO el guion en escenas Y ADEMÁS
// desglose cada una en paneles de una sola vez arriesga perder calidad o
// truncar la respuesta en un guion largo). Reglas y forma de campos
// validadas a mano contra un capítulo real antes de meterlas acá — ver
// memoria/conversación de diseño del desglose en paneles.
const PANEL_SYSTEM_PROMPT = `Sos parte del pipeline de producción de NarraDos. Tu tarea es desglosar un fragmento de guion narrativo (prosa) en una secuencia de "paneles" para una escena cinemática tipo cómic/novela visual — cada panel es una imagen fija con un texto debajo.

Reglas conceptuales para decidir cuándo crear un panel NUEVO (y cuándo NO):
- Nueva localización o establecimiento visual → panel nuevo.
- Presentación de un personaje importante → panel propio, especialmente la primera vez que aparece.
- Revelación narrativa (un nombre, un dato, una palabra clave) → panel nuevo.
- Cambio físico importante en la escena (puertas cerrándose, luces cambiando, explosión, colapso) → panel nuevo.
- Cambio emocional que el espectador debe notar → panel nuevo.
- Diálogo sin cambio visual → NO necesariamente panel nuevo, puede compartir panel con lo anterior.
- Acciones consecutivas que forman un único momento → agruparlas en un solo panel.
- Cliffhanger o información que debe recibir énfasis → panel independiente.
- El texto debajo de un panel no tiene que coincidir 1:1 con un párrafo del guion — puede combinar varias oraciones si visualmente pertenecen al mismo momento.
- La imagen nunca debe intentar representar información abstracta imposible de fotografiar (p. ej. "sus vidas convertidas en cifras") — tenés que traducirla a una composición visual concreta y filmable.
- No te saltees ninguna oración/línea de diálogo del texto original — cada una tiene que quedar reflejada en el displayText de algún panel, aunque compartan panel con otras.

Para cada panel devolvé un objeto con estos campos exactos:
- "imageDescription": qué debe mostrar la imagen, en inglés, descriptivo y concreto (esto se manda a un generador de imágenes) — sin diálogo ni texto dentro de la imagen.
- "displayText": el texto en español que aparece debajo del panel — literal, tal cual se muestra al jugador.
- "narrativePurpose": uno de "establishing", "character_intro", "dialogue", "revelation", "action", "reaction", "transition", "cliffhanger".
- "characters": array de nombres de personajes visiblemente presentes en ESTA imagen puntual (no todos los de la escena, solo los que aparecen en este panel).
- "location": string corta describiendo dónde pasa esto.
- "continuity": objeto libre (claves y valores en string) con cualquier dato de continuidad relevante para que el panel se vea consistente con los anteriores/siguientes (iluminación, posición de personajes, objetos en escena, etc.).

Devolvé ÚNICAMENTE un objeto JSON válido: {"panels": [{"imageDescription": "...", "displayText": "...", "narrativePurpose": "...", "characters": ["..."], "location": "...", "continuity": {"...": "..."}}]}`;

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

function coerceAlternateLooks(value: unknown): ScriptBreakdownAlternateLook[] {
  if (!Array.isArray(value)) return [];
  const usedKeys = new Set<string>();
  return value.map((entry, index) => {
    const l = entry && typeof entry === 'object' ? (entry as Record<string, unknown>) : {};
    const label = typeof l['label'] === 'string' && l['label'] ? l['label'] : `Look ${index + 1}`;
    let key = typeof l['key'] === 'string' && l['key'] ? slugify(l['key']) : slugify(label);
    while (usedKeys.has(key)) key = `${key}-2`;
    usedKeys.add(key);
    return {
      key,
      label,
      description: typeof l['description'] === 'string' ? l['description'] : '',
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
      alternateLooks: coerceAlternateLooks(c['alternateLooks']),
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
      sourceText: typeof s['sourceText'] === 'string' ? s['sourceText'] : '',
      panels: coercePanels(s['panels']),
      bridgeFromPrevious: typeof s['bridgeFromPrevious'] === 'string' && s['bridgeFromPrevious'] ? s['bridgeFromPrevious'] : null,
      characterIds: Array.isArray(s['characterIds']) ? s['characterIds'].filter((x): x is string => typeof x === 'string') : [],
      objects: coerceObjects(s['objects']),
      minigame,
      reviewStatus,
    };
  });
}

const NARRATIVE_PURPOSES: NarrativePurpose[] = [
  'establishing',
  'character_intro',
  'dialogue',
  'revelation',
  'action',
  'reaction',
  'transition',
  'cliffhanger',
];

function coercePanels(value: unknown): ScriptBreakdownPanel[] {
  if (!Array.isArray(value)) return [];
  return value.map((entry, index) => {
    const p = entry && typeof entry === 'object' ? (entry as Record<string, unknown>) : {};
    const continuityRaw =
      p['continuity'] && typeof p['continuity'] === 'object' ? (p['continuity'] as Record<string, unknown>) : {};
    const continuity: Record<string, string> = {};
    for (const [key, val] of Object.entries(continuityRaw)) {
      if (typeof val === 'string') continuity[key] = val;
    }
    return {
      id: typeof p['id'] === 'string' && p['id'] ? p['id'] : `panel-${index + 1}`,
      imageDescription: typeof p['imageDescription'] === 'string' ? p['imageDescription'] : '',
      displayText: typeof p['displayText'] === 'string' ? p['displayText'] : '',
      narrativePurpose: NARRATIVE_PURPOSES.includes(p['narrativePurpose'] as NarrativePurpose)
        ? (p['narrativePurpose'] as NarrativePurpose)
        : 'action',
      characters: Array.isArray(p['characters']) ? p['characters'].filter((x): x is string => typeof x === 'string') : [],
      location: typeof p['location'] === 'string' ? p['location'] : '',
      continuity,
    };
  });
}

function extractSourceTextMarkers(value: unknown): { start: string; end: string }[] {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => {
    const s = entry && typeof entry === 'object' ? (entry as Record<string, unknown>) : {};
    return {
      start: typeof s['sourceTextStart'] === 'string' ? s['sourceTextStart'].trim() : '',
      end: typeof s['sourceTextEnd'] === 'string' ? s['sourceTextEnd'].trim() : '',
    };
  });
}

/** El paso 1 ya no copia el texto completo de cada escena adentro de su
 * propia respuesta — eso era lo que inflaba la salida al tamaño del guion
 * entero (o más, con el overhead de JSON) en un guion largo, y el modelo
 * la cortaba a mitad de camino sin avisar (solo aparecían 2-3 escenas en
 * vez de todas). Ahora pide solo un fragmento corto de inicio y otro de
 * fin por escena, y acá se recorta el guion original ENTRE esos dos
 * puntos con `indexOf` — el cursor avanza escena por escena para no
 * engancharse con una repetición anterior del mismo fragmento. Si algún
 * marcador no aparece tal cual en el guion (el modelo lo parafraseó), esa
 * escena queda con sourceText vacío y `looksLikeIncompleteSourceText` más
 * abajo la agarra igual que el caso viejo del placeholder. */
function resolveSourceTexts(
  scriptText: string,
  markers: { start: string; end: string }[],
): { texts: string[]; finalCursor: number } {
  let cursor = 0;
  const texts = markers.map(({ start, end }) => {
    if (!start || !end) return '';
    const startIndex = scriptText.indexOf(start, cursor);
    if (startIndex === -1) return '';
    const endMatchIndex = scriptText.indexOf(end, startIndex + start.length);
    if (endMatchIndex === -1) return '';
    const endIndex = endMatchIndex + end.length;
    cursor = endIndex;
    return scriptText.slice(startIndex, endIndex);
  });
  return { texts, finalCursor: cursor };
}

const MIN_SOURCE_TEXT_LENGTH = 300;

/** Heurística barata contra el caso visto en producción: el paso 1 abrevia
 * una escena larga con un placeholder ("...(el texto completo hasta tal
 * frase)") en vez de copiarla entera. No hay forma de estar 100% seguro
 * sin releer el guion completo, así que esto es deliberadamente amplio —
 * mejor un falso positivo (una escena corta de verdad queda sin paneles y
 * hay que pedirlos a mano) que mandarle un placeholder al paso 2 y sacar
 * un error de JSON roto que no explica nada. */
function looksLikeIncompleteSourceText(sourceText: string): boolean {
  const trimmed = sourceText.trim();
  if (trimmed.length < MIN_SOURCE_TEXT_LENGTH) return true;
  if (/\.\.\.\s*\(/.test(trimmed)) return true;
  if (/texto (completo|restante|entero)/i.test(trimmed)) return true;
  return false;
}

/** Un llamado enfocado por escena, no un loop dentro del prompt gigante de
 * arriba — ver comentario de PANEL_SYSTEM_PROMPT. Falla individual (una
 * escena puntual) no aborta el análisis entero: se junta como warning y
 * esa escena queda con panels: [] para reintentar después a mano. */
async function generateScenePanels(
  apiKey: string,
  sceneId: string,
  sceneTitle: string,
  sourceText: string,
): Promise<{ panels: ScriptBreakdownPanel[] } | { error: string }> {
  if (!sourceText.trim()) return { panels: [] };
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-4.1',
        temperature: 0.4,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: PANEL_SYSTEM_PROMPT },
          { role: 'user', content: sourceText },
        ],
      }),
    });
    if (!response.ok) {
      return { error: `${sceneTitle}: ${await formatApiError('OpenAI', response)}` };
    }
    const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    const content = data.choices?.[0]?.message?.content;
    if (!content) return { error: `${sceneTitle}: OpenAI no devolvió contenido.` };
    const parsed = JSON.parse(content) as { panels?: unknown };
    const panels = coercePanels(parsed.panels).map((panel, index) => ({
      ...panel,
      id: `${sceneId}-panel-${index + 1}`,
    }));
    return { panels };
  } catch (error) {
    return { error: `${sceneTitle}: ${error instanceof Error ? error.message : String(error)}` };
  }
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
          max_tokens: 16384,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: scriptText },
          ],
        }),
      });
      if (!response.ok) {
        return { ok: false, error: await formatApiError('OpenAI', response) };
      }
      const data = (await response.json()) as {
        choices?: { message?: { content?: string }; finish_reason?: string }[];
      };
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        return { ok: false, error: 'OpenAI no devolvió contenido.' };
      }
      const parsed: unknown = JSON.parse(content);
      const parsedObj = parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
      const sourceTextMarkers = extractSourceTextMarkers(parsedObj['scenes']);
      const breakdown = coerceScriptBreakdown(parsed);
      // Recortar el texto real de cada escena del guion original acá, en
      // código — ver comentario de resolveSourceTexts. `breakdown.scenes`
      // conserva el mismo orden/cantidad que `parsedObj['scenes']` porque
      // coerceScenes solo mapea, nunca filtra.
      const { texts: resolvedSourceTexts, finalCursor } = resolveSourceTexts(scriptText, sourceTextMarkers);
      breakdown.scenes.forEach((scene, index) => {
        scene.sourceText = resolvedSourceTexts[index] ?? '';
      });

      const warnings: string[] = [];
      // Visto en producción con un guion largo (varios capítulos pegados en
      // un solo texto): el modelo a veces devuelve un JSON válido y bien
      // formado, pero deja de leer a mitad del guion y arma escenas solo con
      // la primera parte, como si el resto no existiera — no es un error de
      // formato, así que no hay excepción que atrapar. La única forma
      // barata de detectarlo es comparar hasta dónde llegó el texto de la
      // última escena reconocida contra el largo real del guion pegado.
      const finishReason = data.choices?.[0]?.finish_reason;
      const coverageRatio = scriptText.length > 0 ? finalCursor / scriptText.length : 1;
      if (finishReason === 'length') {
        warnings.push(
          'El guion es tan largo que la respuesta de la IA se cortó antes de terminar de leerlo — probá partirlo ' +
            'en dos o más mitades y analizar cada una por separado.',
        );
      } else if (coverageRatio < 0.85) {
        const coveredPct = Math.round(coverageRatio * 100);
        warnings.push(
          `El análisis solo llegó a cubrir aproximadamente el ${coveredPct}% del guion pegado (se reconocieron ` +
            `${breakdown.scenes.length} escena(s), pero parece quedar texto sin procesar al final) — probá pegar ` +
            'el resto por separado, o partir el guion en mitades más cortas y analizar cada una.',
        );
      }

      // Segundo paso: un llamado de IA por escena para desglosarla en
      // paneles cinemáticos (ver PANEL_SYSTEM_PROMPT/generateScenePanels
      // arriba) — secuencial a propósito, no en paralelo, para no reventar
      // rate limits con un guion de muchas escenas. Una escena que falla
      // no aborta el análisis entero: queda con panels: [] y su motivo se
      // junta en `warnings` para que el usuario sepa cuál reintentar.
      for (const scene of breakdown.scenes) {
        // Visto en producción: en una escena larga/compleja el primer paso
        // a veces "hace trampa" y en vez de copiar el texto entero escribe
        // algo tipo "...(el texto completo hasta tal frase)" — mandarle ESO
        // al segundo paso lo confunde (intenta "completar" el placeholder
        // en vez de desglosar texto real) y termina devolviendo JSON roto,
        // con un error de parseo que no dice nada sobre la causa real.
        // Mejor cortar acá con un aviso claro que apunta al problema real.
        if (looksLikeIncompleteSourceText(scene.sourceText)) {
          warnings.push(
            `${scene.title}: no se pudo ubicar el texto original de esta escena en el guion (el fragmento que dio ` +
              'la IA para encontrarla no coincidió) — abrí "Paneles cinemáticos" en esta escena para pegar el ' +
              'texto a mano y generar los paneles solo para ella.',
          );
          continue;
        }
        const result = await generateScenePanels(config.openaiApiKey, scene.id, scene.title, scene.sourceText);
        if ('error' in result) {
          warnings.push(result.error);
        } else {
          scene.panels = result.panels;
        }
      }

      return { ok: true, breakdown, warnings };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  // Reintento puntual para una escena que quedó sin paneles — el usuario
  // pega el texto de esa escena a mano (ver aviso en el loop de arriba) y
  // esto corre solo el paso 2 (generateScenePanels) para ella, sin repetir
  // el análisis del guion entero.
  ipcMain.handle(
    'script-breakdown:generate-scene-panels',
    async (_event, sceneId: unknown, sceneTitle: unknown, sourceText: unknown) => {
      if (typeof sceneId !== 'string' || typeof sceneTitle !== 'string' || typeof sourceText !== 'string') {
        return { ok: false, error: 'Datos inválidos.' };
      }
      if (!sourceText.trim()) {
        return { ok: false, error: 'Pegá el texto de la escena antes de generar.' };
      }
      const config = await getStoredAiIntegrationsConfig();
      if (!config.openaiApiKey) {
        return { ok: false, error: 'Falta la API key de OpenAI en Ajustes → Integraciones IA.' };
      }
      const result = await generateScenePanels(config.openaiApiKey, sceneId, sceneTitle, sourceText);
      if ('error' in result) {
        return { ok: false, error: result.error };
      }
      return { ok: true, sourceText, panels: result.panels };
    },
  );

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
