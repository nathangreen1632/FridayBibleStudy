import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      // Socket.IO WS → backend (must proxy the upgrade)
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true,            // <<< important: enable WebSocket proxying
        changeOrigin: true,
      },
    },
  },
});
