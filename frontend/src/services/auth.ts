import type { Usuario } from "../types";
import { ehPerfil } from "../utils/permissoes";
import { api } from "./api";
import {
  gravarToken,
  gravarUsuario,
  lerRecebimentoDoToken,
  lerToken,
  lerUsuarioGravado,
  limparSessao,
} from "./sessao";

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

/** Grava o token, com o instante local em que chegou, e o usuário da sessão. */
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

interface PrazoDoToken {
  exp?: unknown;
  iat?: unknown;
}

/**
 * O token já venceu? A validade é a duração do token (exp - iat, em segundos), contada a partir do
 * instante local em que ele chegou: assim, um relógio adiantado ou atrasado no posto não encurta nem
 * estica a sessão. Sem o instante de chegada (sessão gravada sem ele) ou sem iat, vale o exp absoluto.
 * Token malformado ou sem exp numérico conta como vencido. A assinatura não é verificada: quem encerra
 * a sessão de fato é o 401 da API.
 */
export function tokenExpirado(
  token: string,
  recebidoEm: number | null = null,
  agora: number = Date.now()
): boolean {
  const partes = token.split(".");
  if (partes.length !== 3 || partes[1] === "") return true;
  try {
    const payload: unknown = JSON.parse(decodificarBase64url(partes[1]));
    const { exp, iat } =
      typeof payload === "object" && payload !== null ? (payload as PrazoDoToken) : ({} as PrazoDoToken);
    if (typeof exp !== "number") return true;
    if (recebidoEm !== null && typeof iat === "number" && exp > iat) {
      return recebidoEm + (exp - iat) * 1000 <= agora;
    }
    return exp * 1000 <= agora;
  } catch {
    return true;
  }
}

/** Há sessão válida: token gravado e ainda no prazo, contado a partir da chegada do token. */
export function estaAutenticado(): boolean {
  const token = lerToken();
  return token !== null && !tokenExpirado(token, lerRecebimentoDoToken());
}

/** Há um token gravado, mas vencido ou ilegível: a sessão expirou. */
export function sessaoExpirada(): boolean {
  const token = lerToken();
  return token !== null && tokenExpirado(token, lerRecebimentoDoToken());
}
