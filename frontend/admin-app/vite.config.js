import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'admin',
      filename: 'remoteEntry.js',
      exposes: { './App': './src/App.jsx' },
      // Consumes the shared UI kit + access layer exposed by the shell.
      remotes: { shell: 'http://localhost:5000/assets/remoteEntry.js' },
      shared: ['react', 'react-dom', 'react-router-dom'],
    }),
  ],
  server: { host: '0.0.0.0', port: 5004 },
  preview: { host: '0.0.0.0', port: 5004 },
  build: { target: 'esnext', modulePreload: false, minify: false, cssCodeSplit: false },
});
