import react from "@astrojs/react";
import compress from "@playform/compress";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import astroOg from "astro-og";

const site = process.env.PUBLIC_SITE_URL ?? "https://example.github.io";
const base = process.env.PUBLIC_BASE_PATH ?? "/";

export default defineConfig({
  site,
  base,
  output: "static",
  integrations: [
    react(),
    astroOg(),
    compress({
      Image: {
        png: {
          compressionLevel: 9,
          effort: 10,
          palette: true,
        },
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
