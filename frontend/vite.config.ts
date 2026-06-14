import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['teamvoteplus-icon.svg', 'teamvoteplus-logo.svg', 'masked-icon.svg', 'apple-touch-icon-v2.png'],
      workbox: {
        // Embed push event handlers inside the generated sw.js so there is
        // exactly ONE service worker registration for scope '/'. Previously
        // push-sw.js was registered separately at the same scope and competed
        // with the VitePWA sw.js after each deployment — whichever registered
        // last became active, so after a VitePWA auto-update the active SW had
        // no push listener and notifications stopped until the user re-toggled.
        importScripts: ['/push-sw.js'],
      },
      manifest: {
        name: 'teamvote+',
        short_name: 'teamvote+',
        description: 'teamvote+ - Team-Management Software für Sportvereine',
        theme_color: '#071535',
        background_color: '#071535',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192-v2.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'pwa-512x512-v2.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'teamvoteplus-icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any'
          },
          {
            src: 'masked-icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'maskable'
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    }
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
})
