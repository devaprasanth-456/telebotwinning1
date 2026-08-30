import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'lucide-react'],
  },
  server: {
    host: true,
    proxy: {
      '/websocket/lifecycle': {
        target: 'wss://crash-gateway-grm-cr.gamedev-tech.cc',
        ws: true,
        changeOrigin: true,
        headers: { Origin: 'https://1play.gamedev-tech.cc' },
        secure: false,
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.log('WS Proxy Error (Lifecycle):', err.message);
          });
        }
      },
      '/websocket/secondary': {
        target: 'wss://crash-gateway-grm-cr.gamedev-tech.cc',
        ws: true,
        changeOrigin: true,
        headers: { Origin: 'https://1play.gamedev-tech.cc' },
        secure: false,
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.log('WS Proxy Error (Secondary):', err.message);
          });
        }
      }
    }
  }
});

