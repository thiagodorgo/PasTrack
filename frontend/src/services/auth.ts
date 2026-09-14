import type { Usuario } from "../types";
import { ehPerfil } from "../utils/permissoes";
import { api } from "./api";
import { gravarToken, gravarUsuario, lerToken, lerUsuarioGravado, limparSessao } from "./sessao";

interface RespostaDoLogin {
  token: string;
  usuario: Usuario;
}

/** Autentica e grava a sessão com o token e o usuário devolvidos. */
export async function login(email: string, senha: string): Promise<Usuario> {
  const { data } = await api.post<RespostaDoLogin>("/auth/login", { email, senha });
  gravarSessao(data.token, data.usuario);
  return data.usuario;
}

/** Usuário logado, lido da API. Responde mesmo com a troca de senha pendente. */
export async function me(): Promise<Usuario> {
  const { data } = await api.get<Usuario>("/auth/me");
  return data;
}

/**
 * Troca a senha do usuário logado e grava o token novo devolvido pela API,
 * porque o token usado na chamada deixa de valer. Devolve o token novo.
 */
export async function alterarSenha(senhaAtual: string, novaSenha: string): Promise<string> {
  const { data } = await api.patch<{ token: string }>("/auth/senha", { senhaAtual, novaSenha });
  gravarToken(data.token);
  return data.token;
}

/** Grava o token e o usuário da sessão. */
export function gravarSessao(token: string, usuario: Usuario): void {
  gravarToken(token);
  gravarUsuario(usuario);
}

export function sair(): void {
  limparSessao();
}

type UsuarioGravado = Omit<Usuario, "deveTrocarSenha"> & { deveTrocarSenha?: unknown };

function pareceUsuario(dados: unknown): dados is UsuarioGravado {
  if (typeof dados !== "object" || dados === null) return false;
  const { id, nome, email, perfil } = dados as Record<string, unknown>;
  return typeof id === "number" && typeof nome === "string" && typeof email === "string" && ehPerfil(perfil);
}

/**
 * Usuário gravado na sessão. Conteúdo ilegível ou fora do formato esperado não derruba a tela:
 * a sessão é limpa e a função devolve null, o que leva de volta ao login.
 */
export function usuarioSalvo(): Usuario | null {
  const gravado = lerUsuarioGravado();
  if (gravado === null) return null;
  try {
    const dados: unknown = JSON.parse(gravado);
    if (pareceUsuario(dados)) {
      // sessões gravadas antes do campo deveTrocarSenha contam como senha já trocada
      return { ...dados, deveTrocarSenha: dados.deveTrocarSenha === true };
    }
  } catch {
    // JSON inválido: segue para a limpeza abaixo
  }
  limparSessao();
  return null;
}

/**
 * Marca na sessão gravada que a senha precisa ser trocada, depois que a API exigiu a troca.
 * Devolve o usuário atualizado, ou null quando não há sessão.
 */
export function marcarTrocaDeSenhaObrigatoria(): Usuario | null {
  const usuario = usuarioSalvo();
  if (!usuario) return null;
  const marcado = { ...usuario, deveTrocarSenha: true };
  gravarUsuario(marcado);
  return marcado;
}

function decodificarBase64url(trecho: string): string {
  const base64 = trecho.replace(/-/g, "+").replace(/_/g, "/");
  const binario = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
  return new TextDecoder().decode(Uint8Array.from(binario, (caractere) => caractere.charCodeAt(0)));
}

/**
 * O token JWT já expirou? Lê o exp (em segundos) do payload, sem verificar a assinatura: quem valida é a API.
 * Token malformado ou sem exp numérico conta como expirado.
 */
export function tokenExpirado(token: string, agora: number = Date.now()): boolean {
  const partes = token.split(".");
  if (partes.length !== 3 || partes[1] === "") return true;
  try {
    const payload: unknown = JSON.parse(decodificarBase64url(partes[1]));
    const exp =
      typeof payload === "object" && payload !== null ? (payload as { exp?: unknown }).exp : undefined;
    return typeof exp !== "number" || exp * 1000 <= agora;
  } catch {
    return true;
  }
}

/** Há sessão válida: token gravado e ainda no prazo. */
export function estaAutenticado(): boolean {
  const token = lerToken();
  return token !== null && !tokenExpirado(token);
}

/** Há um token gravado, mas vencido ou ilegível: a sessão expirou. */
export function sessaoExpirada(): boolean {
  const token = lerToken();
  return token !== null && tokenExpirado(token);
}
