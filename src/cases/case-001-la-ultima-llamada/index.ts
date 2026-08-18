import agents from './agents.json';
import caseMeta from './case.json';
import characters from './characters.json';
import dialoguesScene1 from './dialogues/scene-1.json';
import dialoguesScene2 from './dialogues/scene-2.json';
import dialoguesScene3To5 from './dialogues/scene-3-5.json';
import equipmentItems from './equipment.json';
import investigation from './investigation.json';
import esStrings from './locales/es.json';
import oficinaActo1 from './scenes/oficina-acto1.json';
import oficinaActo2 from './scenes/oficina-acto2.json';
import oficinaLlamada from './scenes/oficina-llamada.json';

export const adventureCaseBundleRaw = {
  case: caseMeta,
  scenes: [oficinaActo1, oficinaLlamada, oficinaActo2],
  dialogues: { ...dialoguesScene1, ...dialoguesScene2, ...dialoguesScene3To5 },
  investigationAreas: investigation.areas,
  mirrorHints: investigation.hints,
  agents,
  equipmentItems,
  strings: esStrings,
  characters,
};
