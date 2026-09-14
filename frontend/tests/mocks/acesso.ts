import { HttpResponse } from "msw";
import type { ErroApi, Perfil } from "../../src/types";
import { type Acao, ehPerfil, pode } from "../../src/utils/permissoes";
import { agoraEmSegundos, lerPayload } from "../utils/jwt";

// Apoio comum dos handlers: respostas no envelope de erro da API e a conferência de sessão e perfil.

export interface UsuarioDoToken {
  id: number;
  nome: string;
  perfil: Perfil;
}

/** Resposta de erro no envelope da API. */
export function responderErro(status: number, corpo: ErroApi) {
  return HttpResponse.json(corpo, { status });
}

/** Resposta 400 de validação, com os erros por campo. */
export function responderDadosInvalidos(campos: Record<string, string>) {
  return responderErro(400, {
    erro: "Dados inválidos",
    codigo: "DADOS_INVALIDOS",
    campos: Object.entries(campos).map(([caminho, mensagem]) => ({ caminho, mensagem })),
  });
}

/** Usuário do token Bearer, lido sem verificar a assinatura. Token ausente, ilegível ou vencido dá null. */
export function usuarioDaRequisicao(request: Request): UsuarioDoToken | null {
  const cabecalho = request.headers.get("Authorization");
  if (!cabecalho?.startsWith("Bearer ")) return null;
  try {
    const { id, nome, perfil, exp } = lerPayload(cabecalho.slice(7));
    if (typeof id !== "number" || typeof nome !== "string" || !ehPerfil(perfil)) return null;
    if (typeof exp !== "number" || exp <= agoraEmSegundos()) return null;
    return { id, nome, perfil };
  } catch {
    return null;
  }
}

/**
 * Confere a sessão e o perfil como a API faz: devolve a resposta de recusa (401 ou 403),
 * ou null quando o acesso é permitido. As consultas dos handlers não chamam esta conferência,
 * para que os testes de página não dependam de sessão; as alterações chamam.
 */
export function recusarAcesso(request: Request, acao?: Acao) {
  const usuario = usuarioDaRequisicao(request);
  if (!usuario) {
    const erro = request.headers.has("Authorization") ? "Token inválido ou expirado" : "Token não informado";
    return responderErro(401, { erro });
  }
  if (acao && !pode(usuario.perfil, acao)) {
    return responderErro(403, { erro: "Acesso negado para este perfil" });
  }
  return null;
}

/** Próximo id livre de uma lista. */
export function proximoId(registros: readonly { id: number }[]): number {
  return registros.reduce((maior, { id }) => Math.max(maior, id), 0) + 1;
}
