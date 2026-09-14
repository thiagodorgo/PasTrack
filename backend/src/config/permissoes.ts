import { PerfilUsuario } from "@prisma/client";

/**
 * Matriz de permissões do PasTrack: cada ação e os perfis autorizados.
 * É a única fonte usada pelas rotas, pelos testes e pela documentação de perfis.
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
} as const satisfies Record<string, readonly PerfilUsuario[]>;

export type Acao = keyof typeof PERMISSOES;

export function pode(perfil: PerfilUsuario, acao: Acao): boolean {
  return (PERMISSOES[acao] as readonly PerfilUsuario[]).includes(perfil);
}
