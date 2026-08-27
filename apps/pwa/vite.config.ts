import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

// En GitHub Pages la app se sirve bajo /<repo>/, no en la raíz del dominio.
// El workflow de deploy exporta VITE_BASE=/nombre-repo/ antes de compilar.
const base = process.env.VITE_BASE ?? "/";

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Inventory Analyzer — Ferretería La Palma",
        short_name: "Inventory",
        description:
          "Analiza el inventario de la ferretería para decidir qué reponer.",
        theme_color: "#0f172a",
        background_color: "#0f172a",
        display: "standalone",
        lang: "es",
        start_url: base,
        scope: base,
        icons: [
          { src: "pwa-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "pwa-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          {
            src: "maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png}"],
        navigateFallback: `${base}index.html`,
      },
    }),
  ],
});
