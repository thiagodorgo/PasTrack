import type { Usuario } from "../types";

// Chaves da sessão no localStorage: o token da API, o instante local em que ele chegou e o usuário logado.
export const CHAVE_TOKEN = "pastrack:token";
export const CHAVE_USUARIO = "pastrack:usuario";
const CHAVE_TOKEN_RECEBIDO_EM = "pastrack:token-recebido-em";

export function lerToken(): string | null {
  return localStorage.getItem(CHAVE_TOKEN);
}

/**
 * Grava o token com o instante local em que ele chegou, de onde a validade é contada.
 * O instante vai antes do token: uma aba que reaja ao token novo já encontra o instante certo.
 */
export function gravarToken(token: string, recebidoEm: number = Date.now()): void {
  localStorage.setItem(CHAVE_TOKEN_RECEBIDO_EM, String(recebidoEm));
  localStorage.setItem(CHAVE_TOKEN, token);
}

/** Instante local, em milissegundos, em que o token atual chegou; null nas sessões gravadas sem ele. */
export function lerRecebimentoDoToken(): number | null {
  const gravado = localStorage.getItem(CHAVE_TOKEN_RECEBIDO_EM);
  if (gravado === null) return null;
  const instante = Number(gravado);
  return Number.isFinite(instante) && instante > 0 ? instante : null;
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
  localStorage.removeItem(CHAVE_TOKEN_RECEBIDO_EM);
  localStorage.removeItem(CHAVE_USUARIO);
}
