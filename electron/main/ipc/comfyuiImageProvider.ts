import sharp from 'sharp';

/**
 * Generación 100% local vía ComfyUI (SDXL) — puerto a TypeScript del mismo
 * workflow ya probado y en uso real en PressForge
 * (~/Desktop/PressForge Studio/pressforge/providers/comfyui_image.py):
 * InstantID cuando hay una imagen de referencia de CARA (mantiene la misma
 * identidad entre retratos/expresiones de un personaje), plano txt2img
 * cuando no hay referencia. No usa ninguna API paga ni tiene moderación de
 * contenido propia — corre contra un servidor ComfyUI ya abierto en esta
 * máquina (ver AiIntegrationsConfig.comfyuiBaseUrl).
 *
 * A diferencia de fal.ai/OpenAI, esto nunca produce canal alfa real —
 * `chromaKeyToTransparent` recorta a mano un fondo verde puro pedido en el
 * prompt (ver GREEN_SCREEN_INSTRUCTION), sin depender de ningún servicio
 * externo de recorte de fondo.
 */

const NEGATIVE_PROMPT =
  'lowres, bad anatomy, bad hands, extra fingers, missing fingers, deformed, mutated, blurry, watermark, text, ' +
  'signature, logo, cartoon, 3d render, cgi, disfigured, extra limbs, cloned face, duplicate, ugly, jpeg artifacts';

export const GREEN_SCREEN_INSTRUCTION =
  'Solid flat pure chroma-key green background (#00FF00), completely uniform, no gradient, no shadow, no texture, no vignette.';

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
  /** Bytes de la imagen de referencia (cara de un personaje ya generado) —
   * si se pasa, usa InstantID para mantener esa identidad. */
  faceReferenceBytes?: Buffer | undefined;
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
): ComfyNode {
  return {
    class_type: 'KSampler',
    inputs: {
      seed,
      steps,
      cfg,
      sampler_name: 'dpmpp_2m',
      scheduler: 'karras',
      denoise: 1.0,
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
      start_at: 0.0,
      end_at: 0.7,
    },
  };
  nodes['5'] = { class_type: 'EmptyLatentImage', inputs: { width: opts.width, height: opts.height, batch_size: 1 } };
  nodes['3'] = samplerNode(seed, opts.steps, opts.cfg, ['60', 0] as [string, number], ['60', 1], ['60', 2]);
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
    if (opts.faceReferenceBytes) {
      const refName = await uploadReferenceImage(baseUrl, opts.faceReferenceBytes);
      workflow = instantIdWorkflow(shared, refName, seed);
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
