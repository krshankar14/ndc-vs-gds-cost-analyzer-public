import path from 'path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined;
          }
          if (
            id.includes('/node_modules/react/') ||
            id.includes('/node_modules/react-dom/') ||
            id.includes('/node_modules/scheduler/')
          ) {
            return 'vendor-react';
          }
          if (id.includes('/node_modules/lucide-react/')) {
            return 'vendor-icons';
          }
          if (
            id.includes('/node_modules/d3-') ||
            id.includes('/node_modules/internmap/') ||
            id.includes('/node_modules/victory-vendor/')
          ) {
            return 'vendor-d3';
          }
          if (id.includes('/node_modules/recharts/')) {
            return 'vendor-recharts';
          }
          return 'vendor-misc';
        },
      },
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
