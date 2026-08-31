import {defineConfig} from 'vite';
import vue from '@vitejs/plugin-vue';
import {fileURLToPath, URL} from 'node:url';

// Browser-only Vue SPA. Relative base keeps asset URLs correct on GitHub Pages (and file:// previews).
// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  plugins: [vue()],
  build: {
    rollupOptions: {
      output: {
        // Rolldown (Vite 8) expects a function; group mirrors the prior package list.
        manualChunks(id) {
          let retValue;
          if (id.includes('node_modules/@codemirror/')) {
            retValue = 'codemirror';
          }

          const isDeobfuscatorPkg = id.includes('node_modules/restringer/') ||
            id.includes('node_modules/flast/');
          // package.json is imported for version labels; keep it out of this
          // chunk so the heavy parser/transform graph can stay lazy.
          if (isDeobfuscatorPkg && !id.endsWith('package.json')) {
            retValue = 'deobfuscator';
          }
          return retValue;
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      'node:worker_threads': fileURLToPath(new URL('./src/shims/node-worker-threads.js', import.meta.url)),
    },
  },
  optimizeDeps: {
    exclude: ['@codemirror/theme-one-dark'],
  },
});
