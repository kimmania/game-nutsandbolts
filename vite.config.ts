import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/game-nutsandbolts/',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-icon.png'],
      manifest: {
        id: '/game-nutsandbolts/',
        name: 'Nuts & Bolts',
        short_name: 'Nuts&Bolts',
        description: 'Unscrew plates and park bolts without jamming the spare holes.',
        theme_color: '#2d2416',
        background_color: '#2d2416',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/game-nutsandbolts/',
        scope: '/game-nutsandbolts/',
        categories: ['games'],
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest,json}'],
        cleanupOutdatedCaches: true,
        navigateFallback: '/game-nutsandbolts/index.html',
        navigateFallbackDenylist: [/\/levels\//],
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              url.pathname.includes('/levels/') && url.pathname.endsWith('.json'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'level-packs',
              networkTimeoutSeconds: 4,
              expiration: {
                maxEntries: 40,
                maxAgeSeconds: 60 * 60 * 24 * 7,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
});
