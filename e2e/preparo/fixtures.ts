import { test as base } from "@playwright/test";
import { arquivoDaSessao, type Perfil } from "./sessao";

/**
 * Cada caso declara o perfil que precisa, e a página já abre logada com ele.
 * Sem perfil declarado, a página abre deslogada, como um visitante.
 */
export const test = base.extend<{ perfil: Perfil | null }>({
  perfil: [null, { option: true }],
  storageState: async ({ perfil }, usar) => {
    await usar(perfil ? arquivoDaSessao(perfil) : { cookies: [], origins: [] });
  },
});

export { expect } from "@playwright/test";
