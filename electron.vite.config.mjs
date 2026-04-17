import { resolve } from "path"
import path from "path"
import { defineConfig, externalizeDepsPlugin } from "electron-vite"
import react from "@vitejs/plugin-react"

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: {
        entry: resolve("Backend/main/index.js"),
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: {
        entry: resolve("Backend/preload/index.js"),
      },
    },
  },
  renderer: {
    root: "Frontend",
    build: {
      rollupOptions: {
        input: resolve("Frontend/index.html"),
      },
    },
    resolve: {
      alias: {
        "@renderer": resolve("Frontend/src"),
        "@": resolve("Frontend/src"),
      },
    },
    plugins: [react()],
  },
})
