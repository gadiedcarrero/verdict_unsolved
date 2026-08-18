import { resolve } from 'node:path';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const root = __dirname;

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'out/main',
      rollupOptions: {
        input: resolve(root, 'electron/main/index.ts'),
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'out/preload',
      rollupOptions: {
        input: resolve(root, 'electron/preload/index.ts'),
        // Forzado a CJS: con sandbox:true (ver electron/main/window.ts), los
        // preload scripts en formato ESM (el default cuando package.json
        // tiene "type": "module") no se cargan de forma confiable — window.api
        // queda undefined sin ningún error visible. CJS es el formato con
        // soporte real para preload en sandbox.
        output: {
          format: 'cjs',
          entryFileNames: '[name].cjs',
        },
      },
    },
  },
  renderer: {
    root: '.',
    publicDir: resolve(root, 'assets'),
    // Vite hace full-reload de la página ante cualquier cambio dentro de
    // publicDir (no es HMR-able, al no ser parte del grafo de módulos). El
    // editor sube fondos/retratos directo a assets/games/**/ por IPC —
    // sin este ignore, cada subida recargaba toda la app y perdía el
    // estado de React (volvía al selector de proyectos). El componente ya
    // actualiza su estado local al confirmarse la subida, así que no hace
    // falta que Vite recargue nada.
    server: {
      watch: {
        ignored: ['**/assets/games/**'],
      },
    },
    resolve: {
      alias: {
        '@': resolve(root, 'src'),
        '@shared': resolve(root, 'shared'),
      },
    },
    build: {
      outDir: 'out/renderer',
      rollupOptions: {
        input: resolve(root, 'index.html'),
      },
    },
    plugins: [react(), tailwindcss()],
  },
});
