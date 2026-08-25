import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const root = __dirname;

const MIME_BY_EXT: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

// Vite solo sabe servir archivos de publicDir que existían (o que su
// watcher vio aparecer) al arrancar el server. Como el watcher ignora
// **/assets/games/** a propósito (ver abajo — evita un full-reload por
// cada retrato subido/generado), cualquier archivo NUEVO ahí queda
// invisible para Vite: la request cae al fallback de SPA y sirve
// index.html con 200 en vez del PNG, y el <img> falla siempre, sin
// importar cuántos reintentos haga el componente (era la causa real de
// "genera bien pero queda en sin foto hasta reiniciar la app"). Este
// middleware sirve /games/**/* directo del disco, en cada request, sin
// depender de ningún cache/listado armado al inicio.
function liveGameAssetsPlugin(): Plugin {
  return {
    name: 'live-game-assets',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/games/')) {
          next();
          return;
        }
        const urlPath = decodeURIComponent(req.url.split('?')[0] ?? '');
        const relativePath = normalize(urlPath.replace(/^\/games\//, ''));
        if (relativePath.startsWith('..')) {
          next();
          return;
        }
        const filePath = join(root, 'assets', 'games', relativePath);
        try {
          const stats = await stat(filePath);
          if (!stats.isFile()) {
            next();
            return;
          }
          res.setHeader('Content-Type', MIME_BY_EXT[extname(filePath).toLowerCase()] ?? 'application/octet-stream');
          res.setHeader('Cache-Control', 'no-cache');
          createReadStream(filePath).pipe(res);
        } catch {
          next();
        }
      });
    },
  };
}

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
    plugins: [liveGameAssetsPlugin(), react(), tailwindcss()],
  },
});
