import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'monaco-editor': ['monaco-editor'],
          'x6': ['@antv/x6'],
          'element-plus': ['element-plus'],
        },
      },
    },
  },
  optimizeDeps: {
    include: ['monaco-editor', '@antv/x6', 'element-plus', 'axios', 'dagre'],
  },
})
