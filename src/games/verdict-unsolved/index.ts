import agents from './agents.json';
import caseMeta from './case.json';
import characters from './characters.json';
import dialoguesScene1 from './dialogues/scene-1.json';
import dialoguesScene2 from './dialogues/scene-2.json';
import dialoguesScene3To5 from './dialogues/scene-3-5.json';
import equipmentItems from './equipment.json';
import investigation from './investigation.json';
import esStrings from './locales/es.json';
import siteSettings from './site-settings.json';

// Carga dinámica: cualquier archivo nuevo en scenes/ (p. ej. creado desde el
// editor visual) se suma solo, sin tocar este archivo ni reiniciar nada más
// que el hot-reload normal de Vite.
const sceneModules = import.meta.glob<{ default: unknown }>('./scenes/*.json', { eager: true });
const scenes = Object.values(sceneModules).map((mod) => mod.default);

export const gameBundleRaw = {
  case: caseMeta,
  scenes,
  dialogues: { ...dialoguesScene1, ...dialoguesScene2, ...dialoguesScene3To5 },
  investigationAreas: investigation.areas,
  mirrorHints: investigation.hints,
  agents,
  equipmentItems,
  strings: esStrings,
  characters,
  siteSettings,
};
