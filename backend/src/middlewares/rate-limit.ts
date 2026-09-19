import { Request, Response } from "express";
import rateLimit, { ipKeyGenerator, Options } from "express-rate-limit";
import { env } from "../config/env";
import { logger } from "../config/logger";

const MINUTO_MS = 60_000;
/** Tamanho máximo de um e-mail válido; evita chaves enormes no contador. */
const TAMANHO_MAXIMO_EMAIL = 254;

/** Encaminha os avisos de configuração do express-rate-limit para o logger da aplicação. */
const logDoLimitador: Options["logger"] = {
  warn: (erro, mensagem) => logger.warn({ err: erro }, mensagem ?? "Aviso do limitador de requisições"),
  error: (erro, mensagem) => logger.error({ err: erro }, mensagem ?? "Falha no limitador de requisições"),
};

function responderLimite(erro: string, codigo: string): Options["handler"] {
  return (_req, res, _next, opcoes) => {
    res.status(opcoes.statusCode).json({ erro, codigo });
  };
}

/** Chave do limite de login: o IP (IPv6 agrupado por sub-rede) mais o e-mail normalizado. */
export function chaveDoLogin(req: Request): string {
  const email: unknown = req.body?.email;
  const normalizado =
    typeof email === "string" ? email.trim().toLowerCase().slice(0, TAMANHO_MAXIMO_EMAIL) : "";
  return `${ipKeyGenerator(req.ip ?? "")}|${normalizado}`;
}

/**
 * Falhas de login por IP e e-mail. Só a credencial recusada (401) conta: acertos, corpo inválido e erro do
 * servidor não bloqueiam ninguém. Ao estourar, responde 429 com Retry-After.
 */
export const limitarLogin = rateLimit({
  windowMs: env.RATE_LIMIT_LOGIN_JANELA_MIN * MINUTO_MS,
  limit: env.RATE_LIMIT_LOGIN_MAX,
  keyGenerator: chaveDoLogin,
  skipSuccessfulRequests: true,
  requestWasSuccessful: (_req, res) => res.statusCode !== 401,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: responderLimite(
    "Muitas tentativas de login. Aguarde alguns minutos e tente de novo.",
    "MUITAS_TENTATIVAS"
  ),
  logger: logDoLimitador,
});

/** Marca a resposta como senha atual errada: a única falha que conta no limite da troca de senha. */
export function marcarFalhaDeCredencial(res: Response) {
  res.locals.falhaDeCredencial = true;
}

/**
 * Senha atual errada na troca de senha, por usuário, com os mesmos limites do login. Sem isso, quem
 * obtivesse um token poderia descobrir a senha atual por tentativa e tomar a conta de vez.
 * Erros de política ou de validação não contam, para não punir quem só escolheu uma senha fraca.
 */
export const limitarTrocaDeSenha = rateLimit({
  windowMs: env.RATE_LIMIT_LOGIN_JANELA_MIN * MINUTO_MS,
  limit: env.RATE_LIMIT_LOGIN_MAX,
  keyGenerator: (req) => "usuario:" + String(req.usuario?.id),
  skipSuccessfulRequests: true,
  requestWasSuccessful: (_req, res) => res.locals.falhaDeCredencial !== true,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: responderLimite(
    "Muitas tentativas com a senha atual errada. Aguarde alguns minutos e tente de novo.",
    "MUITAS_TENTATIVAS"
  ),
  logger: logDoLimitador,
});

/**
 * Limite por IP em /api, antes do autenticar: só contra varredura, por isso alto. Vários postos podem
 * chegar pelo mesmo IP (NAT ou proxy), e o orçamento do dia a dia fica no limite por usuário.
 * Responde 429 com o mesmo código do login.
 */
export const limitarGlobal = rateLimit({
  windowMs: MINUTO_MS,
  limit: env.RATE_LIMIT_GLOBAL_MAX,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: responderLimite("Muitas requisições. Aguarde um instante e tente de novo.", "MUITAS_TENTATIVAS"),
  logger: logDoLimitador,
});

/**
 * Limite por usuário autenticado, depois do autenticar: cada pessoa tem o próprio orçamento, mesmo
 * dividindo o IP com outros postos, e trocar de IP não renova o de quem estourou.
 */
export const limitarPorUsuario = rateLimit({
  windowMs: MINUTO_MS,
  limit: env.RATE_LIMIT_USUARIO_MAX,
  keyGenerator: (req) => "usuario:" + String(req.usuario?.id),
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: responderLimite("Muitas requisições. Aguarde um instante e tente de novo.", "MUITAS_TENTATIVAS"),
  logger: logDoLimitador,
});
