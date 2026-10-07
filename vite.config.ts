import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  build: {
    outDir: 'dist', sourcemap: false, chunkSizeWarningLimit: 900,
    rollupOptions: { output: { manualChunks: { firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage', 'firebase/functions'], vendor: ['react', 'react-dom', 'react-router-dom'], charts: ['recharts'], xlsx: ['xlsx'] } } }
  }
});
