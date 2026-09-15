/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Endereço base da API. Sem valor, vale /api, atendido pelo proxy do Vite ou pelo nginx. */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
