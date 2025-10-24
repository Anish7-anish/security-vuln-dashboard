import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const NGROK_HOST = 'sammie-instructive-acceleratedly.ngrok-free.dev';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,                          // listen on all interfaces
    allowedHosts: [NGROK_HOST],
    hmr: {
      protocol: 'wss',
      host: NGROK_HOST,
      clientPort: 443
    },
  }
});