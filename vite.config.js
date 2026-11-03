import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import viteApiPlugin from './vite-api-plugin.js'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    viteApiPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons.svg'],
      workbox: {
        navigateFallbackDenylist: [/^\/api\//, /^\/videos\//],
      },
      manifest: {
        name: 'Serging Gym',
        short_name: 'SergingGym',
        description: 'App de entrenamiento, fuerza, carrera y rehabilitación de rodilla',
        theme_color: '#F5F5F7',
        background_color: '#F5F5F7',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'favicon.svg',
            sizes: '192x192 512x512',
            type: 'image/svg+xml'
          }
        ]
      }
    })
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-')) {
            return 'charts'
          }
        },
      },
    },
  },
})
