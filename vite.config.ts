import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

/* Data e hora do build, mostradas em Ajustes para conferir se o celular está na última versão */
const VERSAO_APP = new Date().toLocaleString('pt-BR', {
  timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
})

export default defineConfig({
  define: { __VERSAO_APP__: JSON.stringify(VERSAO_APP) },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'apple-touch-icon-v4.png', 'logo.svg'],
      manifest: {
        id: '/',
        name: 'Pulpito',
        short_name: 'Pulpito',
        description: 'Prepare, pregue e projete suas mensagens.',
        lang: 'pt-BR',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#0D0C09',
        theme_color: '#0D0C09',
        // O iPhone mais novo usa estes ícones (e não o apple-touch-icon) ao "Abrir como app web".
        // Caminhos absolutos e purpose 'any' explícito evitam o ícone com a letra "P".
        icons: [
          { src: '/apple-touch-icon-v4.png', sizes: '180x180', type: 'image/png', purpose: 'any' },
          { src: '/pwa-192x192-v4.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/pwa-512x512-v4.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/maskable-icon-512x512-v4.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        importScripts: ['push-sw.js'],
        globIgnores: [
          '**/pdf-*.js', '**/pdf.worker*', '**/jszip*.js',
          '**/*-cyrillic*', '**/*-greek*', '**/*-vietnamese*',
        ],          
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // Bíblia: baixa uma vez, depois usa do aparelho
            urlPattern: /\/biblia\/[A-Z]+\.json$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'biblia',
              expiration: { maxEntries: 10 },
              cacheableResponse: { statuses: [200] },
            },
          },
          {
            // Dados do Supabase: tenta a internet, se falhar usa a última cópia
            urlPattern: ({ url, request }) =>
              request.method === 'GET' &&
              url.hostname.endsWith('.supabase.co') &&
              url.pathname.startsWith('/rest/v1/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api',
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
      },
    }),
  ],
})