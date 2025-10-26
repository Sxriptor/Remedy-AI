/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly REMEDY_API_URL?: string;
  readonly MAIN_VITE_RENDERER_URL: string;
  readonly ELECTRON_RENDERER_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
