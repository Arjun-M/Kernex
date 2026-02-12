import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'plugin-rewrite',
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          if (req.url?.startsWith('/i/')) {
            req.url = req.url.replace('/i/', '/src/plugins/');
          }
          next();
        });
      }
    }
  ],
  server: {
    host: true ,
    port: 5173 ,
    proxy: {
      '/u': 'http://localhost:3000',
      '/api': {
        target: 'http://localhost:3000',
        ws: true,
        changeOrigin: true
      }
    }
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        'http-tester': resolve(__dirname, 'src/plugins/http-tester/index.html'),
        'notes': resolve(__dirname, 'src/plugins/notes/index.html'),
        'terminal': resolve(__dirname, 'src/plugins/terminal/index.html'),
        'db': resolve(__dirname, 'src/plugins/db/index.html'),
        'files': resolve(__dirname, 'src/plugins/files/index.html'),
        'hash': resolve(__dirname, 'src/plugins/hash/index.html'),
        'base64': resolve(__dirname, 'src/plugins/base64/index.html'),
        'jwt': resolve(__dirname, 'src/plugins/jwt/index.html'),
        'uuid': resolve(__dirname, 'src/plugins/uuid/index.html'),
        'password': resolve(__dirname, 'src/plugins/password/index.html'),
        'hmac': resolve(__dirname, 'src/plugins/hmac/index.html'),
        'encryption': resolve(__dirname, 'src/plugins/encryption/index.html'),
        'json': resolve(__dirname, 'src/plugins/json/index.html'),
        'yaml': resolve(__dirname, 'src/plugins/yaml/index.html'),
        'csv': resolve(__dirname, 'src/plugins/csv/index.html'),
        'diff': resolve(__dirname, 'src/plugins/diff/index.html'),
        'regex': resolve(__dirname, 'src/plugins/regex/index.html'),
        'markdown': resolve(__dirname, 'src/plugins/markdown/index.html'),
        'logs-viewer': resolve(__dirname, 'src/plugins/logs-viewer/index.html'),
        'xml': resolve(__dirname, 'src/plugins/xml/index.html'),
        'short-urls': resolve(__dirname, 'src/plugins/short-urls/index.html')
      }
    }
  }
})
