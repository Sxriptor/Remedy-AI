import { resolve } from "path";
import {
  defineConfig,
  loadEnv,
  swcPlugin,
  externalizeDepsPlugin,
} from "electron-vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode);

  return {
    main: {
      build: {
        sourcemap: true,
      },
      resolve: {
        alias: {
          "@main": resolve("src/main"),
          "@locales": resolve("src/locales"),
          "@resources": resolve("resources"),
          "@shared": resolve("src/shared"),
        },
      },
      define: {
        "process.env.MAIN_VITE_SUPABASE_URL": JSON.stringify(
          env.MAIN_VITE_SUPABASE_URL
        ),
        "process.env.MAIN_VITE_SUPABASE_ANON_KEY": JSON.stringify(
          env.MAIN_VITE_SUPABASE_ANON_KEY
        ),
        "process.env.MAIN_VITE_SUPABASE_REDIRECT_URL": JSON.stringify(
          env.MAIN_VITE_SUPABASE_REDIRECT_URL
        ),
      },
      plugins: [externalizeDepsPlugin(), swcPlugin()],
    },
    preload: {
      plugins: [externalizeDepsPlugin()],
    },
    renderer: {
      build: {
        sourcemap: true,
      },
      css: {
        preprocessorOptions: {
          scss: {
            api: "modern",
          },
        },
      },
      resolve: {
        alias: {
          "@renderer": resolve("src/renderer/src"),
          "@locales": resolve("src/locales"),
          "@shared": resolve("src/shared"),
        },
      },
      plugins: [svgr(), react()],
    },
  };
});
