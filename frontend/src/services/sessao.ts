import type { Usuario } from "../types";

// Chaves da sessão no localStorage: o token da API e o usuário logado.
export const CHAVE_TOKEN = "pastrack:token";
export const CHAVE_USUARIO = "pastrack:usuario";

export function lerToken(): string | null {
  return localStorage.getItem(CHAVE_TOKEN);
}

export function gravarToken(token: string): void {
  localStorage.setItem(CHAVE_TOKEN, token);
}

/** Conteúdo bruto do usuário gravado; quem interpreta e valida é usuarioSalvo, em auth.ts. */
export function lerUsuarioGravado(): string | null {
  return localStorage.getItem(CHAVE_USUARIO);
}

export function gravarUsuario(usuario: Usuario): void {
  localStorage.setItem(CHAVE_USUARIO, JSON.stringify(usuario));
}

export function limparSessao(): void {
  localStorage.removeItem(CHAVE_TOKEN);
  localStorage.removeItem(CHAVE_USUARIO);
}
