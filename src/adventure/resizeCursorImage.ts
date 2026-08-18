/** Tamaño máximo (en cualquiera de los dos ejes) para que un cursor CSS
 * `cursor: url(...)` se siga renderizando como imagen custom — pasado este
 * límite los navegadores lo ignoran en silencio y caen al cursor de
 * respaldo, dando la sensación de que "no guardó" aunque el archivo sí se
 * subió bien. */
const MAX_CURSOR_DIM = 64;

/** Redimensiona (solo hacia abajo, nunca agranda) una imagen subida por el
 * usuario a un tamaño apto para usarse como cursor CSS, preservando
 * transparencia. Devuelve PNG siempre, sin importar el formato de origen. */
export async function resizeCursorImage(file: File): Promise<Uint8Array> {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, MAX_CURSOR_DIM / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No se pudo preparar el canvas para redimensionar el cursor.');
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('No se pudo generar la imagen redimensionada del cursor.');
    return new Uint8Array(await blob.arrayBuffer());
  } finally {
    bitmap.close();
  }
}
