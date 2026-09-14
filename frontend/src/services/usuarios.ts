import type { Perfil, UsuarioCriado, UsuarioGerenciado } from "../types";
import { api } from "./api";

// Gestão de usuários: todas as rotas são exclusivas do ADMINISTRADOR.

export interface NovoUsuario {
  nome: string;
  email: string;
  perfil: Perfil;
}

export interface AtualizacaoUsuario {
  nome?: string;
  perfil?: Perfil;
}

export async function listarUsuarios(): Promise<UsuarioGerenciado[]> {
  const { data } = await api.get<UsuarioGerenciado[]>("/usuarios");
  return data;
}

/** Cria o usuário com uma senha temporária, devolvida uma única vez. */
export async function criarUsuario(dados: NovoUsuario): Promise<UsuarioCriado> {
  const { data } = await api.post<UsuarioCriado>("/usuarios", dados);
  return data;
}

/** Rebaixar o perfil invalida as sessões do usuário. */
export async function atualizarUsuario(id: number, dados: AtualizacaoUsuario): Promise<UsuarioGerenciado> {
  const { data } = await api.put<UsuarioGerenciado>(`/usuarios/${id}`, dados);
  return data;
}

/** Ativa ou desativa o usuário. Desativar invalida as sessões dele. */
export async function definirAtivo(id: number, ativo: boolean): Promise<UsuarioGerenciado> {
  const { data } = await api.patch<UsuarioGerenciado>(`/usuarios/${id}/ativo`, { ativo });
  return data;
}

/** Gera uma senha temporária nova, devolvida uma única vez; o usuário volta a ter de trocá-la. */
export async function redefinirSenha(id: number): Promise<string> {
  const { data } = await api.post<{ senhaTemporaria: string }>(`/usuarios/${id}/redefinir-senha`);
  return data.senhaTemporaria;
}
