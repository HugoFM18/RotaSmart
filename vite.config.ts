import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

const isPages = process.env.GITHUB_ACTIONS === "true";

export default defineConfig({
  base: isPages ? "/RotaSmart/" : "/",
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom"],
          i18n: ["i18next", "react-i18next", "i18next-browser-languagedetector"],
        },
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "RotaSmart — Rotaciones con datos de NASA",
        short_name: "RotaSmart",
        description:
          "Herramienta de apoyo a decisiones para rotaciones de cultivo con datos de la NASA.",
        theme_color: "#2F6B4F",
        background_color: "#FAF9F6",
        display: "standalone",
        start_url: ".",
        icons: [
          { src: "favicon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,json}"],
        globIgnores: ["data/**"],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: ({ url, sameOrigin }) => sameOrigin && /\/data\//.test(url.pathname),
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "map-geometry-world-v1",
              expiration: { maxEntries: 24, maxAgeSeconds: 2592000 },
              cacheableResponse: { statuses: [200] },
            },
          },
          {
            urlPattern: /^https:\/\/gibs\.earthdata\.nasa\.gov\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "gibs-tiles",
              expiration: { maxEntries: 500, maxAgeSeconds: 604800 },
            },
          },
          {
            urlPattern: /^https:\/\/(server\.arcgisonline\.com|tiles\.maps\.eox\.at)\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "satellite-tiles-v1",
              expiration: { maxEntries: 300, maxAgeSeconds: 604800 },
              cacheableResponse: { statuses: [200] },
            },
          },
          {
            urlPattern: /^https:\/\/(tiles\.openfreemap\.org|demotiles\.maplibre\.org)\/.*/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "local-boundary-tiles-v1",
              expiration: { maxEntries: 256, maxAgeSeconds: 604800 },
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
      },
    }),
  ],
});
