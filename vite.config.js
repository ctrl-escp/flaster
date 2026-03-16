import {defineConfig} from 'vite';
import vue from '@vitejs/plugin-vue';
import {fileURLToPath, URL} from 'node:url';

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      'node:crypto': fileURLToPath(new URL('./src/shims/node-crypto.js', import.meta.url)),
    },
  },
  optimizeDeps: {
    exclude: ['@codemirror/theme-one-dark'],
  },
});
