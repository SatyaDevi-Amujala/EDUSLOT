import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'shell',
      filename: 'remoteEntry.js',
      // The shell exposes the shared UI kit + access/permission layer so the
      // admin-app and enroll-app remotes can import them (single source of truth).
      exposes: {
        './ui': './src/ui/index.js',
        './access': './src/access/PermissionContext.jsx',
      },
      remotes: {
        admin: 'http://localhost:5004/assets/remoteEntry.js',
        enroll: 'http://localhost:5002/assets/remoteEntry.js',
      },
      shared: ['react', 'react-dom', 'react-router-dom'],
    }),
  ],
  server: { host: '0.0.0.0', port: 5000 },
  preview: { host: '0.0.0.0', port: 5000 },
  build: { target: 'esnext', modulePreload: false, minify: false, cssCodeSplit: false },
});
