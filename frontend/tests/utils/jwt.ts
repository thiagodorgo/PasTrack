import type { Usuario } from "../../src/types";

type DadosDoToken = Pick<Usuario, "id" | "nome" | "perfil">;

const OITO_HORAS = 8 * 60 * 60;

export function agoraEmSegundos(): number {
  return Math.floor(Date.now() / 1000);
}

function paraBase64url(texto: string): string {
  const binario = Array.from(new TextEncoder().encode(texto), (byte) => String.fromCharCode(byte)).join("");
  return btoa(binario).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function deBase64url(trecho: string): string {
  const binario = atob(trecho.replace(/-/g, "+").replace(/_/g, "/"));
  return new TextDecoder().decode(Uint8Array.from(binario, (caractere) => caractere.charCodeAt(0)));
}

/** Monta um JWT só para testes: cabeçalho e payload em base64url, com assinatura fictícia. */
export function criarJwt(payload: Record<string, unknown>): string {
  const cabecalho = paraBase64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  return `${cabecalho}.${paraBase64url(JSON.stringify(payload))}.${paraBase64url("assinatura-de-teste")}`;
}

/** Lê o payload de um JWT sem verificar a assinatura. */
export function lerPayload(token: string): Record<string, unknown> {
  return JSON.parse(deBase64url(token.split(".")[1]));
}

/** Token com o mesmo payload emitido pelo backend, válido por 8 horas a partir de agora. */
export function criarTokenValido({ id, nome, perfil }: DadosDoToken): string {
  const iat = agoraEmSegundos();
  return criarJwt({ id, nome, perfil, iat, exp: iat + OITO_HORAS });
}

/** Token emitido há 9 horas, que expirou há 1 hora. */
export function criarTokenExpirado({ id, nome, perfil }: DadosDoToken): string {
  const exp = agoraEmSegundos() - 60 * 60;
  return criarJwt({ id, nome, perfil, iat: exp - OITO_HORAS, exp });
}
