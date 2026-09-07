import sharp from 'sharp';

/**
 * Generación 100% local vía ComfyUI (SDXL) — puerto a TypeScript del mismo
 * workflow ya probado y en uso real en PressForge
 * (~/Desktop/PressForge Studio/pressforge/providers/comfyui_image.py):
 * InstantID cuando hay una imagen de referencia de CARA en primer plano
 * (mantiene la misma identidad entre retratos/expresiones de un
 * personaje — pensado para bustos, no sirve para escenas anchas: su
 * ControlNet condiciona el encuadre a partir de la posición/escala de la
 * cara en la referencia, así que forzarlo en un fondo con varios
 * personajes de cuerpo entero termina arrastrando la composición entera a
 * un primer plano de esa cara), IP-Adapter (con start_at retrasado para
 * que la composición ancha del prompt se establezca antes de que la
 * identidad de la referencia empiece a influir — ver comentario en
 * ipAdapterWorkflow) cuando hay una o más referencias de SUJETO/estilo
 * general (fondos con varios personajes — tolera mejor una composición
 * ancha, a costa de fidelidad de cara más débil que InstantID), plano
 * txt2img cuando no hay ninguna referencia. No
 * usa ninguna API paga ni tiene moderación de contenido propia — corre
 * contra un servidor ComfyUI ya abierto en esta máquina (ver
 * AiIntegrationsConfig.comfyuiBaseUrl).
 *
 * A diferencia de fal.ai/OpenAI, esto nunca produce canal alfa real —
 * `chromaKeyToTransparent` recorta a mano un fondo verde puro pedido en el
 * prompt (ver GREEN_SCREEN_INSTRUCTION), sin depender de ningún servicio
 * externo de recorte de fondo.
 */

// SDXL-family checkpoints (RealVisXL incluido) alucinan letras/pseudo-texto
// gratis con muchísima frecuencia — la negativa en texto plano no alcanza
// de forma confiable. El peso entre paréntesis (sintaxis nativa de
// ComfyUI/CLIPTextEncode) sube la atención sobre esos tokens puntuales sin
// tocar el resto de la negativa.
// Ojo con lo que se pone acá: esto contradecía al prompt positivo. Tenía
// "cartoon" en el negativo mientras el estilo de fondos pide "illustrated
// digital painting" y el de cuerpos pide "cel-shaded cartoon" — el modelo
// quedaba tironeado entre los dos y, con un checkpoint fotorrealista de
// árbitro, ganaba la foto. Ahora el negativo empuja en la misma dirección que
// el estilo: lo que se rechaza es la foto, no el dibujo.
//
// Es una decisión de estilo a nivel plataforma, que a futuro debería ser un
// ajuste por juego (un juego fotorrealista querría exactamente lo contrario).
// InstantID no entra desde el primer paso de denoising a propósito.
//
// Su ControlNet condiciona sobre los puntos faciales de la imagen de
// referencia, y esos puntos codifican la EXPRESIÓN: dónde está la boca,
// cuánto se abren los ojos, qué hacen las cejas. La composición de la cara se
// decide en los primeros pasos, así que con start_at en 0 la cara de la
// referencia quedaba fijada antes de que el prompt pudiera pedir otra cosa —
// y todas las expresiones de un personaje salían con el mismo gesto que su
// retrato base, sin importar qué dijera el texto.
//
// Dejando correr los primeros pasos sin condicionar, el prompt establece el
// gesto y recién después entra InstantID a corregir la identidad. Es la misma
// técnica del start_at que ya se usaba para IP-Adapter en los fondos.
//
// Si en algún momento las caras dejan de parecerse entre sí, este es el
// número a bajar; si las expresiones vuelven a salir todas iguales, a subir.
const IDENTITY_START_AT = 0.25;

/**
 * Cuánto se deja cambiar la imagen al editarla (ver img2imgWorkflow).
 *
 * Cambiar de expresión es un cambio ESTRUCTURAL de la cara —ojos muy abiertos,
 * boca estirada, cejas arriba—, no un retoque de textura. Con 0.45 el
 * resultado salía casi idéntico al retrato base: conservaba perfecto la
 * identidad, el encuadre y la ropa, pero la cara apenas se movía y "asustado"
 * quedaba igual de sereno que el original.
 *
 * Si una expresión sale demasiado tímida, subilo; si el personaje empieza a
 * cambiar de cara o de edad entre expresiones, bajalo. Es el único número que
 * hay que calibrar contra el checkpoint que se esté usando.
 */
const EDIT_STRENGTH = 0.6;

const NEGATIVE_PROMPT =
  'lowres, bad anatomy, bad hands, extra fingers, missing fingers, deformed, mutated, blurry, ' +
  '(watermark:1.3), (text:1.5), (letters:1.4), (words:1.4), (writing:1.4), (readable text:1.5), ' +
  '(typography:1.3), (caption:1.3), (subtitles:1.3), (sign:1.3), (label:1.3), (logo:1.3), signature, ' +
  '(photorealistic:1.3), (photograph:1.3), (photo:1.2), (realistic skin texture:1.2), ' +
  // El recorte de cabeza salía incluso pidiendo margen en el positivo: para
  // un sprite de cuerpo entero, tocar el borde es un defecto, no un encuadre.
  '(cropped head:1.4), (head out of frame:1.4), (cut off at the top:1.3), (cropped:1.2), ' +
  '3d render, cgi, disfigured, extra limbs, cloned face, duplicate, ugly, jpeg artifacts';

export const GREEN_SCREEN_INSTRUCTION =
  'Solid flat pure chroma-key green background (#00FF00), completely uniform, no gradient, no shadow, no texture, no vignette.';

/** El juego es multi-idioma y todo el texto que ve el jugador se agrega
 * aparte, por código (diálogo, subtítulos de panel, etc.) — nunca puede
 * quedar HORNEADO dentro de una imagen generada, porque no hay forma de
 * traducirlo después. "No text/no watermark" solo no alcanza de forma
 * confiable: los modelos meten letras gratis en carteles, pantallas,
 * papeles o tapas de libro aunque no se les haya pedido — por eso esto
 * nombra cada superficie típica donde se cuela texto, no solo "no text" en
 * general. Se usa en el prompt POSITIVO de los tres proveedores; para
 * ComfyUI además se refuerza en el negativo (ver NEGATIVE_PROMPT). */
export const NO_TEXT_INSTRUCTION =
  'Absolutely no text, letters, numbers, or readable characters anywhere in the image, in any language — no ' +
  'signs, no screens or monitor displays showing text, no papers or documents with visible writing, no labels, ' +
  'no book covers or spines with titles, no UI elements, no logos. All in-game text is added separately by the ' +
  'game engine and must never be baked into the artwork.';

type ComfyNode = { class_type: string; inputs: Record<string, unknown> };
type ComfyWorkflow = Record<string, ComfyNode>;

export type ComfyUIGenerateOptions = {
  baseUrl: string;
  checkpoint: string;
  prompt: string;
  width: number;
  height: number;
  steps?: number;
  cfg?: number;
  /** 'face': UNA referencia, cara en primer plano (retratos) — usa
   * InstantID. 'subject': una o más referencias de sujeto/estilo general
   * (fondos, escenas anchas con varios personajes) — usa IP-Adapter, que
   * no fuerza el encuadre de la composición como InstantID. Sin esto,
   * txt2img plano. */
  reference?:
    | { mode: 'face'; bytes: Buffer }
    | { mode: 'subject'; bytes: Buffer[] }
    /** Retoca ESTA imagen en vez de generar una parecida (ver
     * img2imgWorkflow). Sin esto se usa EDIT_STRENGTH, que es el valor
     * calibrado para cambiar una expresión sin perder al personaje. */
    | { mode: 'edit'; bytes: Buffer; strength?: number }
    | undefined;
};

function baseNodes(checkpoint: string): { nodes: ComfyWorkflow; model: [string, number]; clip: [string, number]; vae: [string, number] } {
  const nodes: ComfyWorkflow = {
    '4': { class_type: 'CheckpointLoaderSimple', inputs: { ckpt_name: checkpoint } },
  };
  return { nodes, model: ['4', 0], clip: ['4', 1], vae: ['4', 2] };
}

function samplerNode(
  seed: number,
  steps: number,
  cfg: number,
  model: [string, number],
  positive: [string, number],
  negative: [string, number],
  // 1.0 = generar de cero (el latente de entrada es ruido puro). Menos que
  // eso solo tiene sentido partiendo de una imagen: ver img2imgWorkflow.
  denoise = 1.0,
): ComfyNode {
  return {
    class_type: 'KSampler',
    inputs: {
      seed,
      steps,
      cfg,
      sampler_name: 'dpmpp_2m',
      scheduler: 'karras',
      denoise,
      model,
      positive,
      negative,
      latent_image: ['5', 0],
    },
  };
}

function txt2imgWorkflow(opts: Required<Pick<ComfyUIGenerateOptions, 'checkpoint' | 'prompt' | 'width' | 'height' | 'steps' | 'cfg'>>, seed: number): ComfyWorkflow {
  const { nodes, model, clip, vae } = baseNodes(opts.checkpoint);
  nodes['6'] = { class_type: 'CLIPTextEncode', inputs: { text: opts.prompt, clip } };
  nodes['7'] = { class_type: 'CLIPTextEncode', inputs: { text: NEGATIVE_PROMPT, clip } };
  nodes['5'] = { class_type: 'EmptyLatentImage', inputs: { width: opts.width, height: opts.height, batch_size: 1 } };
  nodes['3'] = samplerNode(seed, opts.steps, opts.cfg, model, ['6', 0], ['7', 0]);
  nodes['8'] = { class_type: 'VAEDecode', inputs: { samples: ['3', 0], vae } };
  nodes['9'] = { class_type: 'SaveImage', inputs: { images: ['8', 0], filename_prefix: 'narradros' } };
  return nodes;
}

/**
 * Editar una imagen que ya existe, en vez de generar una nueva parecida.
 *
 * La imagen de referencia se codifica como latente de partida y se denoisea
 * solo parcialmente, así que todo lo que el prompt no pide cambiar —edad,
 * pelo, ropa, encuadre, paleta, estilo— sobrevive porque no se vuelve a
 * generar: ya está ahí. Es lo que hace "a esta imagen ponela sonriendo".
 *
 * InstantID resuelve otro problema: "generá a alguien con ESTA cara", que
 * sirve para un personaje nuevo pero no para retocar uno existente — arrastra
 * los puntos faciales de la referencia (y con ellos su expresión) y reinventa
 * todo lo demás desde el prompt, que es de dónde salía que el mismo personaje
 * cambiara de edad entre una expresión y otra.
 *
 * `width`/`height` no se usan: el tamaño lo fija la imagen de entrada, y que
 * el encuadre quede idéntico es justamente lo que se quiere.
 */
function img2imgWorkflow(
  opts: Required<Pick<ComfyUIGenerateOptions, 'checkpoint' | 'prompt' | 'steps' | 'cfg'>>,
  referenceName: string,
  denoise: number,
  seed: number,
): ComfyWorkflow {
  const { nodes, model, clip, vae } = baseNodes(opts.checkpoint);
  nodes['6'] = { class_type: 'CLIPTextEncode', inputs: { text: opts.prompt, clip } };
  nodes['7'] = { class_type: 'CLIPTextEncode', inputs: { text: NEGATIVE_PROMPT, clip } };
  nodes['13'] = { class_type: 'LoadImage', inputs: { image: referenceName } };
  nodes['5'] = { class_type: 'VAEEncode', inputs: { pixels: ['13', 0], vae } };
  nodes['3'] = samplerNode(seed, opts.steps, opts.cfg, model, ['6', 0], ['7', 0], denoise);
  nodes['8'] = { class_type: 'VAEDecode', inputs: { samples: ['3', 0], vae } };
  nodes['9'] = { class_type: 'SaveImage', inputs: { images: ['8', 0], filename_prefix: 'narradros' } };
  return nodes;
}

function instantIdWorkflow(
  opts: Required<Pick<ComfyUIGenerateOptions, 'checkpoint' | 'prompt' | 'width' | 'height' | 'steps' | 'cfg'>>,
  refName: string,
  seed: number,
): ComfyWorkflow {
  const { nodes, model, clip, vae } = baseNodes(opts.checkpoint);
  nodes['11'] = { class_type: 'InstantIDModelLoader', inputs: { instantid_file: 'ip-adapter.bin' } };
  nodes['38'] = { class_type: 'InstantIDFaceAnalysis', inputs: { provider: 'CPU' } };
  nodes['16'] = { class_type: 'ControlNetLoader', inputs: { control_net_name: 'instantid_controlnet.safetensors' } };
  nodes['13'] = { class_type: 'LoadImage', inputs: { image: refName } };
  nodes['6'] = { class_type: 'CLIPTextEncode', inputs: { text: opts.prompt, clip } };
  nodes['7'] = { class_type: 'CLIPTextEncode', inputs: { text: NEGATIVE_PROMPT, clip } };
  nodes['60'] = {
    class_type: 'ApplyInstantID',
    inputs: {
      instantid: ['11', 0],
      insightface: ['38', 0],
      control_net: ['16', 0],
      image: ['13', 0],
      model,
      positive: ['6', 0],
      negative: ['7', 0],
      weight: 0.65,
      start_at: IDENTITY_START_AT,
      end_at: 0.85,
    },
  };
  nodes['5'] = { class_type: 'EmptyLatentImage', inputs: { width: opts.width, height: opts.height, batch_size: 1 } };
  nodes['3'] = samplerNode(seed, opts.steps, opts.cfg, ['60', 0] as [string, number], ['60', 1], ['60', 2]);
  nodes['8'] = { class_type: 'VAEDecode', inputs: { samples: ['3', 0], vae } };
  nodes['9'] = { class_type: 'SaveImage', inputs: { images: ['8', 0], filename_prefix: 'narradros' } };
  return nodes;
}

// A diferencia de InstantID (una sola cara, ControlNet que fija el
// encuadre), IP-Adapter transfiere "look" general (rasgos/estilo, no
// landmarks de cara) y admite combinar varias referencias en una sola
// imagen batcheada — por eso es la opción correcta para un fondo ancho con
// varios personajes, aunque la fidelidad de cara por personaje sea menor.
// Puerto directo de `_ipadapter` en el comfyui_image.py de PressForge.
function ipAdapterWorkflow(
  opts: Required<Pick<ComfyUIGenerateOptions, 'checkpoint' | 'prompt' | 'width' | 'height' | 'steps' | 'cfg'>>,
  refNames: string[],
  seed: number,
): ComfyWorkflow {
  const { nodes, model, clip, vae } = baseNodes(opts.checkpoint);
  let imgRef: [string, number] | null = null;
  refNames.forEach((name, i) => {
    const loadId = `30${i}`;
    nodes[loadId] = { class_type: 'LoadImage', inputs: { image: name } };
    if (imgRef === null) {
      imgRef = [loadId, 0];
    } else {
      const batchId = `31${i}`;
      nodes[batchId] = { class_type: 'ImageBatch', inputs: { image1: imgRef, image2: [loadId, 0] } };
      imgRef = [batchId, 0];
    }
  });
  // El preset "PLUS FACE (portraits)" sería lo ideal acá (recorta la
  // referencia a solo la cara, sin arrastrar su composición) pero necesita
  // un archivo de modelo (ip-adapter-plus-face_sdxl_vit-h.safetensors) que
  // esta instalación de ComfyUI no tiene descargado — solo está el de
  // "PLUS (high strength)", que sí transfiere identidad Y composición de
  // la referencia (con retratos de busto como referencia, eso arrastraba
  // ese mismo encuadre de busto al fondo entero, ignorando el prompt).
  // Mitigación sin depender de un archivo nuevo: retrasar cuándo empieza a
  // influir IP-Adapter (start_at) para que la composición ancha del prompt
  // de texto ya esté establecida en los primeros pasos de denoise antes de
  // que la identidad de la referencia empiece a pesar, y bajar el peso —
  // sacrifica algo de fidelidad de cara a cambio de respetar el encuadre.
  nodes['20'] = { class_type: 'IPAdapterUnifiedLoader', inputs: { model, preset: 'PLUS (high strength)' } };
  nodes['21'] = {
    class_type: 'IPAdapterAdvanced',
    inputs: {
      model: ['20', 0],
      ipadapter: ['20', 1],
      image: imgRef,
      weight: 0.45,
      weight_type: 'linear',
      combine_embeds: 'average',
      start_at: 0.3,
      end_at: 0.85,
      embeds_scaling: 'V only',
    },
  };
  nodes['6'] = { class_type: 'CLIPTextEncode', inputs: { text: opts.prompt, clip } };
  nodes['7'] = { class_type: 'CLIPTextEncode', inputs: { text: NEGATIVE_PROMPT, clip } };
  nodes['5'] = { class_type: 'EmptyLatentImage', inputs: { width: opts.width, height: opts.height, batch_size: 1 } };
  nodes['3'] = samplerNode(seed, opts.steps, opts.cfg, ['21', 0] as [string, number], ['6', 0], ['7', 0]);
  nodes['8'] = { class_type: 'VAEDecode', inputs: { samples: ['3', 0], vae } };
  nodes['9'] = { class_type: 'SaveImage', inputs: { images: ['8', 0], filename_prefix: 'narradros' } };
  return nodes;
}

async function postPrompt(baseUrl: string, workflow: ComfyWorkflow): Promise<string> {
  const response = await fetch(`${baseUrl}/prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: workflow, client_id: crypto.randomUUID() }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`ComfyUI rechazó el workflow: ${text.slice(0, 400)}`);
  }
  const data = (await response.json()) as { prompt_id: string };
  return data.prompt_id;
}

type ComfyHistoryEntry = {
  status?: { status_str?: string };
  outputs?: Record<string, { images?: { filename: string; subfolder?: string; type?: string }[] }>;
};

async function waitForResult(baseUrl: string, promptId: string): Promise<ComfyHistoryEntry> {
  // ComfyUI no tiene webhook — se consulta /history hasta que aparece la
  // entrada, igual que el pipeline de PressForge que ya funciona así.
  for (;;) {
    const response = await fetch(`${baseUrl}/history/${promptId}`);
    if (!response.ok) throw new Error(`ComfyUI /history devolvió ${response.status}.`);
    const hist = (await response.json()) as Record<string, ComfyHistoryEntry>;
    const entry = hist[promptId];
    if (entry) {
      if (entry.status?.status_str === 'error') {
        throw new Error('ComfyUI falló al generar — revisá su consola.');
      }
      return entry;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

async function fetchGeneratedImage(baseUrl: string, hist: ComfyHistoryEntry): Promise<Buffer> {
  for (const node of Object.values(hist.outputs ?? {})) {
    for (const img of node.images ?? []) {
      const params = new URLSearchParams({
        filename: img.filename,
        subfolder: img.subfolder ?? '',
        type: img.type ?? 'output',
      });
      const response = await fetch(`${baseUrl}/view?${params.toString()}`);
      if (!response.ok) throw new Error(`No se pudo descargar el resultado de ComfyUI (${response.status}).`);
      return Buffer.from(await response.arrayBuffer());
    }
  }
  throw new Error('ComfyUI no devolvió ninguna imagen.');
}

async function uploadReferenceImage(baseUrl: string, bytes: Buffer): Promise<string> {
  const form = new FormData();
  form.append('image', new Blob([new Uint8Array(bytes)], { type: 'image/png' }), 'reference.png');
  form.append('overwrite', 'true');
  const response = await fetch(`${baseUrl}/upload/image`, { method: 'POST', body: form });
  if (!response.ok) throw new Error(`No se pudo subir la referencia a ComfyUI (${response.status}).`);
  const data = (await response.json()) as { name: string };
  return data.name;
}

/** Envuelve los errores de red con el mismo mensaje accionable que ya usa
 * PressForge — "¿está abierto?" es la causa real el 95% de las veces. */
function wrapConnectionError(baseUrl: string, error: unknown): Error {
  if (error instanceof TypeError) {
    return new Error(
      `No pude conectar con ComfyUI en ${baseUrl}. ¿Está corriendo? Abrí ComfyUI en esta máquina y reintentá.`,
    );
  }
  return error instanceof Error ? error : new Error(String(error));
}

export async function generateComfyUIImage(opts: ComfyUIGenerateOptions): Promise<Buffer> {
  const baseUrl = opts.baseUrl.replace(/\/+$/, '');
  const steps = opts.steps ?? 28;
  const cfg = opts.cfg ?? 5.0;
  const seed = Math.floor(Math.random() * 2 ** 32);
  const shared = { checkpoint: opts.checkpoint, prompt: opts.prompt, width: opts.width, height: opts.height, steps, cfg };
  try {
    let workflow: ComfyWorkflow;
    if (opts.reference?.mode === 'edit') {
      const refName = await uploadReferenceImage(baseUrl, opts.reference.bytes);
      workflow = img2imgWorkflow(shared, refName, opts.reference.strength ?? EDIT_STRENGTH, seed);
    } else if (opts.reference?.mode === 'face') {
      const refName = await uploadReferenceImage(baseUrl, opts.reference.bytes);
      workflow = instantIdWorkflow(shared, refName, seed);
    } else if (opts.reference?.mode === 'subject' && opts.reference.bytes.length > 0) {
      const refNames = await Promise.all(opts.reference.bytes.map((bytes) => uploadReferenceImage(baseUrl, bytes)));
      workflow = ipAdapterWorkflow(shared, refNames, seed);
    } else {
      workflow = txt2imgWorkflow(shared, seed);
    }
    const promptId = await postPrompt(baseUrl, workflow);
    const hist = await waitForResult(baseUrl, promptId);
    return await fetchGeneratedImage(baseUrl, hist);
  } catch (error) {
    throw wrapConnectionError(baseUrl, error);
  }
}

/** Recorta a transparente el fondo verde puro pedido en el prompt (ver
 * GREEN_SCREEN_INSTRUCTION) — reemplazo 100% local del paso de rembg que
 * usan los otros proveedores, sin llamar a ningún servicio externo. Umbral
 * generoso (distancia euclídea en RGB) para tolerar el verde no ser
 * perfectamente uniforme sin comerse los bordes de la figura. */
export async function chromaKeyToTransparent(pngBytes: Buffer, threshold = 90): Promise<Buffer> {
  const image = sharp(pngBytes).ensureAlpha();
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  const target = { r: 0, g: 255, b: 0 };
  for (let i = 0; i < data.length; i += info.channels) {
    const r = data[i]!;
    const g = data[i + 1]!;
    const b = data[i + 2]!;
    const distance = Math.sqrt((r - target.r) ** 2 + (g - target.g) ** 2 + (b - target.b) ** 2);
    if (distance < threshold) {
      data[i + 3] = 0;
    }
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: info.channels as 4 } })
    .png()
    .toBuffer();
}
