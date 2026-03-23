import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('@supabase/supabase-js')) {
            return 'supabase'
          }

          if (
            id.includes('react-syntax-highlighter') ||
            id.includes('/refractor/') ||
            id.includes('/highlight.js/')
          ) {
            return 'syntax-highlighter'
          }

          if (
            id.includes('react-markdown') ||
            id.includes('/remark-') ||
            id.includes('/mdast-') ||
            id.includes('/micromark') ||
            id.includes('/unist-') ||
            id.includes('/hast-')
          ) {
            return 'markdown'
          }

          return undefined
        },
      },
    },
  },
  server: {
    port: 3100,
    proxy: {
      '/api': {
        target: 'http://localhost:8900',
        changeOrigin: true,
      },
    },
  },
})
