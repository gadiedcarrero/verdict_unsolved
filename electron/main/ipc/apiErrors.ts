/**
 * Formatea el cuerpo de una respuesta de error de una API externa (OpenAI,
 * ElevenLabs) en un mensaje legible en vez del JSON crudo — antes cada
 * handler mostraba `{"error":{"message":"...","type":"...","code":"..."}}`
 * completo en la interfaz. Casos especiales (como "sin crédito") devuelven
 * un mensaje en español con el link correspondiente — el renderer detecta
 * URLs dentro del mensaje y las muestra clickeables (ver ErrorText en
 * CharacterEditorPanel.tsx).
 */
function extractMessage(parsed: unknown): string | null {
  if (typeof parsed !== 'object' || parsed === null) return null;
  const obj = parsed as Record<string, unknown>;
  const error = obj['error'];
  const detail = obj['detail'];
  const candidates: unknown[] = [
    typeof error === 'object' && error !== null ? (error as Record<string, unknown>)['message'] : undefined,
    typeof detail === 'object' && detail !== null ? (detail as Record<string, unknown>)['message'] : undefined,
    typeof detail === 'string' ? detail : undefined,
    obj['message'],
  ];
  const found = candidates.find((c) => typeof c === 'string' && c.trim().length > 0);
  return typeof found === 'string' ? found : null;
}

function isOpenAiOutOfCredit(parsed: unknown): boolean {
  if (typeof parsed !== 'object' || parsed === null) return false;
  const error = (parsed as Record<string, unknown>)['error'];
  if (typeof error !== 'object' || error === null) return false;
  const e = error as Record<string, unknown>;
  return e['code'] === 'credit_balance_exhausted' || e['type'] === 'insufficient_quota';
}

export async function formatApiError(providerName: string, response: Response): Promise<string> {
  const bodyText = await response.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(bodyText);
  } catch {
    return `${providerName} devolvió un error (${response.status}): ${bodyText.slice(0, 500)}`;
  }
  if (providerName === 'OpenAI' && isOpenAiOutOfCredit(parsed)) {
    return 'Se acabó el crédito de tu cuenta de OpenAI — cargá más en https://platform.openai.com/settings/organization/billing/ para seguir generando.';
  }
  const message = extractMessage(parsed);
  if (message) {
    return `${providerName}: ${message}`;
  }
  return `${providerName} devolvió un error (${response.status}): ${bodyText.slice(0, 500)}`;
}
