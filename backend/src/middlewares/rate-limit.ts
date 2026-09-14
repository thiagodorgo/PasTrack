import { Request } from "express";
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

/** Falhas de login por IP e e-mail. Acertos não contam; ao estourar, responde 429 com Retry-After. */
export const limitarLogin = rateLimit({
  windowMs: env.RATE_LIMIT_LOGIN_JANELA_MIN * MINUTO_MS,
  limit: env.RATE_LIMIT_LOGIN_MAX,
  keyGenerator: chaveDoLogin,
  skipSuccessfulRequests: true,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: responderLimite(
    "Muitas tentativas de login. Aguarde alguns minutos e tente de novo.",
    "MUITAS_TENTATIVAS"
  ),
  logger: logDoLimitador,
});

/** Limite geral por IP em /api, contra abuso e varreduras. */
export const limitarGlobal = rateLimit({
  windowMs: MINUTO_MS,
  limit: env.RATE_LIMIT_GLOBAL_MAX,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: responderLimite("Muitas requisições. Aguarde um instante e tente de novo.", "MUITAS_REQUISICOES"),
  logger: logDoLimitador,
});
