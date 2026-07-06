import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',

      manifest: {
        name:             'Limpimax',
        short_name:       'Limpimax',
        description:      'Sistema de gestión de pedidos — Limpimax Productos Químicos',
        theme_color:      '#0D5C8A',
        background_color: '#F4F6F8',
        display:          'standalone',
        orientation:      'portrait',
        start_url:        '/',
        lang:             'es',
        icons: [
          {
            src:   '/icons/icon-192.png',
            sizes: '192x192',
            type:  'image/png',
          },
          {
            src:   '/icons/icon-512.png',
            sizes: '512x512',
            type:  'image/png',
          },
          {
            src:     '/icons/icon-512.png',
            sizes:   '512x512',
            type:    'image/png',
            purpose: 'maskable',
          },
        ],
      },

      workbox: {
        globPatterns:      ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigationPreload: true,
        runtimeCaching: [
          {
            // Rutas de API — NetworkFirst para datos frescos con fallback offline
            urlPattern: /^\/api\/.*/i,
            handler:    'NetworkFirst',
            options: {
              cacheName:      'api-cache',
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries:    50,
                maxAgeSeconds: 60 * 5, // 5 minutos
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Supabase REST — StaleWhileRevalidate: UI aparece con datos de cache
            // mientras actualiza en background, nunca pantalla en blanco al navegar
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/i,
            handler:    'StaleWhileRevalidate',
            options: {
              cacheName: 'supabase-api-cache',
              expiration: {
                maxEntries:    50,
                maxAgeSeconds: 60 * 5,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Supabase Auth — NetworkFirst, nunca cachear tokens viejos
            urlPattern: /^https:\/\/.*\.supabase\.co\/auth\/.*/i,
            handler:    'NetworkFirst',
            options: { cacheName: 'supabase-auth-cache' },
          },
        ],
      },

      devOptions: {
        enabled: false,
      },
    }),
  ],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return
          if (/react-router-dom|\/react\/|\/react-dom\//.test(id)) return 'vendor-react'
          if (id.includes('@tanstack/react-query')) return 'vendor-query'
          if (id.includes('@supabase/supabase-js')) return 'vendor-supabase'
          if (/@radix-ui|lucide-react|@tabler\/icons-react/.test(id)) return 'vendor-ui'
          if (id.includes('chart.js')) return 'vendor-charts'
          if (id.includes('xlsx')) return 'vendor-xlsx'
        },
      },
    },
  },

  server: {
    proxy: {
      '/api': {
        target:        'http://127.0.0.1:3000',
        changeOrigin:  true,
        secure:        false,
        configure: (proxy) => {
          proxy.on('error', (err) => console.error('[proxy error]', err.message))
        },
      },
    },
  },
})
