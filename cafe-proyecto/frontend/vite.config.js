import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const localProxy = {
  '/django-api': {
    target: 'http://127.0.0.1:8000',
    changeOrigin: true
  },
  '/api': {
    target: 'http://localhost:5000',
    changeOrigin: true
  },
  '/uploads': {
    target: 'http://localhost:5000',
    changeOrigin: true
  }
};

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'offline-app-assets',
      generateBundle(_options, bundle) {
        const assets = Object.keys(bundle)
          .filter((name) => name.endsWith('.js') || name.endsWith('.css'))
          .map((name) => `/${name}`);
        this.emitFile({
          type: 'asset',
          fileName: 'offline-assets.json',
          source: JSON.stringify(assets),
        });
      },
    },
  ],
  server: {
    port: 3000,
    proxy: localProxy,
  },
  preview: { proxy: localProxy },
});
