import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync("./package.json", "utf-8")) as {
  version: string;
};

export default defineConfig(({ mode }) => {
  const isCapacitor = process.env.VITE_CAPACITOR === "true";

  return {
    base: isCapacitor ? "./" : "/",
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
    },
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
    },
    plugins: [
      react(),
      !isCapacitor &&
        VitePWA({
          registerType: "autoUpdate",
          injectRegister: null,
          includeAssets: ["favicon.ico"],
          workbox: {
            globPatterns: ["**/*.{js,css,html,ico,png,svg,webp}"],
            skipWaiting: true,
            clientsClaim: true,
          },
          manifest: {
            name: "Mi jardín",
            short_name: "Mi jardín",
            description: "Identifica y cuida tus plantas con una foto",
            theme_color: "#2D5A27",
            background_color: "#FDFCF8",
            display: "standalone",
            orientation: "portrait",
            lang: "es",
            start_url: "/",
            icons: [
              {
                src: "/pwa-192.png",
                sizes: "192x192",
                type: "image/png",
              },
              {
                src: "/pwa-512.png",
                sizes: "512x512",
                type: "image/png",
              },
              {
                src: "/pwa-512.png",
                sizes: "512x512",
                type: "image/png",
                purpose: "maskable",
              },
            ],
          },
        }),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
