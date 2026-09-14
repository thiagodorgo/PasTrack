import type { Perfil } from "../types";

/**
 * Espelho da matriz de permissões do backend (backend/src/config/permissoes.ts).
 * Serve só para a interface esconder o que o perfil não pode fazer: quem decide é sempre a API.
 */
export const PERMISSOES = {
  consultar: ["ADMINISTRADOR", "GESTOR", "OPERADOR", "COMPRADOR"],
  gerenciarPastilhas: ["ADMINISTRADOR", "GESTOR"],
  gerenciarFabricantes: ["ADMINISTRADOR", "GESTOR"],
  gerenciarFornecedores: ["ADMINISTRADOR", "GESTOR", "COMPRADOR"],
  registrarEntrada: ["ADMINISTRADOR", "GESTOR", "OPERADOR", "COMPRADOR"],
  registrarSaida: ["ADMINISTRADOR", "GESTOR", "OPERADOR"],
  resolverAlerta: ["ADMINISTRADOR", "GESTOR"],
  gerenciarUsuarios: ["ADMINISTRADOR"],
} as const satisfies Record<string, readonly Perfil[]>;

export type Acao = keyof typeof PERMISSOES;

export const PERFIS: readonly Perfil[] = ["ADMINISTRADOR", "GESTOR", "OPERADOR", "COMPRADOR"];

/** Nome de cada perfil para exibir na tela. */
export const ROTULOS_PERFIL: Record<Perfil, string> = {
  ADMINISTRADOR: "Administrador",
  GESTOR: "Gestor",
  OPERADOR: "Operador",
  COMPRADOR: "Comprador",
};

export function ehPerfil(valor: unknown): valor is Perfil {
  return typeof valor === "string" && (PERFIS as readonly string[]).includes(valor);
}

/** Indica se o perfil pode executar a ação. Sem perfil, nada é permitido. */
export function pode(perfil: Perfil | null | undefined, acao: Acao): boolean {
  if (!perfil) return false;
  return (PERMISSOES[acao] as readonly Perfil[]).includes(perfil);
}
