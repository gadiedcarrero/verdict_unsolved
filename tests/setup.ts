import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Con `globals: false` (ver vitest.config.ts) testing-library no encuentra un
// `afterEach` global al que engancharse, así que su limpieza automática entre
// tests no corre: sin esto, cada render se acumula en el mismo documento y las
// consultas por rol/texto encuentran los elementos de los tests anteriores.
afterEach(() => {
  cleanup();
});
