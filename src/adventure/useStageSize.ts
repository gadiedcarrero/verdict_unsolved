import { useEffect, useState, type RefObject } from 'react';

/**
 * Todo el arte de escena se produce en 16:9. El "stage" se fija a este ratio
 * (con barras a los costados o arriba/abajo si no calza) para que el arte y
 * los objetos posicionados en % compartan siempre el mismo sistema de
 * coordenadas, sin importar el tamaño de la ventana. Ver SceneViewer.tsx.
 */
const SCENE_ASPECT_RATIO = 16 / 9;

export function useStageSize(containerRef: RefObject<HTMLDivElement | null>): { width: number; height: number } {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width: containerWidth, height: containerHeight } = entry.contentRect;
      let width = containerWidth;
      let height = width / SCENE_ASPECT_RATIO;
      if (height > containerHeight) {
        height = containerHeight;
        width = height * SCENE_ASPECT_RATIO;
      }
      setSize({ width, height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [containerRef]);

  return size;
}
