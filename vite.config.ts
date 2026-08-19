import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import path from "path"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  build: {
    outDir: "dist",
    assetsDir: "assets",
    rollupOptions: {
      output: {
        manualChunks(id) {
          const isReactPackage = ["react", "react-dom", "react-router-dom"].some((name) =>
            id.includes(`/node_modules/${name}/`),
          )
          if (isReactPackage) {
            return "react"
          }
          if (id.includes("/node_modules/recharts/")) {
            return "recharts"
          }
          if (id.includes("/node_modules/d3-geo/")) {
            return "d3-geo"
          }
        },
      },
    },
  },
})
