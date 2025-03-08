import { fileURLToPath, URL } from 'url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import environment from 'vite-plugin-environment';
import dotenv from 'dotenv';
import path from 'path'
import fs from 'fs'; // Add this missing import

dotenv.config({ path: '../../.env' });

export default defineConfig({
  build: {
    emptyOutDir: true,
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: "globalThis",
      },
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:4943",
        changeOrigin: true,
      },
    },
    port: 4944, // explicitly set the port
    headers: {
      'Content-Security-Policy': "default-src 'self'; connect-src *; worker-src 'self' blob:; script-src 'self' blob: 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:;"
    }
  },
  plugins: [
    react(),
    environment("all", { prefix: "CANISTER_" }),
    environment("all", { prefix: "DFX_" }),
    {
      name: 'html-transform',
      transformIndexHtml(html, ctx) {
        if (process.env.NODE_ENV !== 'production') {
          return fs.readFileSync(path.resolve(__dirname, 'index-dev.html'), 'utf-8');
        }
        return html;
      },
    },
  ],
  resolve: {
    alias: [
      {
        find: "declarations",
        replacement: fileURLToPath(
          new URL("../declarations", import.meta.url)
        ),
      },{
        find: "@",
        replacement: path.resolve(__dirname, 'src'),
      }
    ],
  },
});
