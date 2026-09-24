import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import pkg from './package.json' with { type: 'json' }

// PokerStats — frontend only, dev server 5181 (see the port map in
// C:\Dev\Apps\CLAUDE.md). There is no backend: every session lives in
// IndexedDB on the phone that logged it.
//
// Hosted on GitHub Pages at https://gigi404.github.io/PokerStats/, so the whole
// app is served from a sub-path. `base` makes Vite prefix every asset URL with
// it, and the manifest's start_url/scope are relative ('./') so they resolve
// against that same sub-path rather than the github.io root — an absolute '/'
// there would install an app that launches onto a GitHub 404.
const BASE = '/PokerStats/'

export default defineConfig({
  base: BASE,
  // Shown on the Backup screen, so "which build is on her phone?" has an answer.
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // Take the new build on next launch. There is one user and nothing to
      // lose mid-update: the data is in IndexedDB, not in the page.
      registerType: 'autoUpdate',

      // Referenced only from index.html, which the plugin does not scan — list
      // them or they are missing exactly when the phone is offline.
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],

      manifest: {
        name: 'PokerStats',
        short_name: 'PokerStats',
        description: 'Live and online poker results — cash games and tournaments.',
        theme_color: '#0b1210',
        background_color: '#0b1210',
        display: 'standalone',
        orientation: 'portrait',
        start_url: './',
        scope: './',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml' },
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },

      workbox: {
        // Precache the build and nothing else: the app never makes a network
        // request of its own, so there is nothing for runtimeCaching to do.
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],

        // The one runtime rule: Playground's daily data file. NetworkFirst so an
        // app opened with signal gets this morning's copy, and one opened at a
        // table with none falls back to the last copy (the tab shows its age).
        // Deliberately NOT precached — a precached copy only changes on deploy.
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.endsWith('/data/playground.json'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'playground-data',
              networkTimeoutSeconds: 4,
              cacheableResponse: { statuses: [200] },
              expiration: { maxEntries: 1 },
            },
          },
        ],
      },
    }),
  ],
  server: { port: 5181, strictPort: true },
  preview: { port: 5181, strictPort: true },
  test: { environment: 'node' },
})
