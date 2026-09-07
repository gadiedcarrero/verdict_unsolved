import caseMeta from './case.json';
import characters from './characters.json';
import esStrings from './locales/es.json';

// Carga dinámica: cualquier escena nueva creada desde el editor se suma sola,
// sin tocar este archivo.
const sceneModules = import.meta.glob<{ default: unknown }>('./scenes/*.json', { eager: true });
const scenes = Object.values(sceneModules).map((mod) => mod.default);

export const gameBundleRaw = {
  case: caseMeta,
  scenes,
  characters,
  strings: esStrings,
};
