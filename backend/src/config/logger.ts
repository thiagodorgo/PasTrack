import { randomUUID } from "node:crypto";
import pino, { DestinationStream, LevelWithSilent, Logger } from "pino";
import { pinoHttp } from "pino-http";
import { env } from "./env";

/**
 * Caminhos que nunca aparecem nos logs: credenciais dos cabeçalhos e qualquer campo de senha,
 * tanto no primeiro nível do objeto logado quanto um nível abaixo (por exemplo, dentro de "corpo").
 */
export const CAMINHOS_REDIGIDOS = [
  "req.headers.authorization",
  "req.headers.cookie",
  "senha",
  "senhaAtual",
  "novaSenha",
  "senhaHash",
  "senhaTemporaria",
  "*.senha",
  "*.senhaAtual",
  "*.novaSenha",
  "*.senhaHash",
  "*.senhaTemporaria",
];

export interface OpcoesLogger {
  nivel?: LevelWithSilent;
  /** Destino alternativo da saída, usado pelos testes para capturar os logs em memória. */
  destino?: DestinationStream;
}

/** Cria um logger JSON com redação de segredos. Sem destino, escreve na saída padrão. */
export function criarLogger({ nivel = env.LOG_LEVEL, destino }: OpcoesLogger = {}): Logger {
  const opcoes = {
    level: nivel,
    redact: CAMINHOS_REDIGIDOS,
    timestamp: pino.stdTimeFunctions.isoTime,
  };
  return destino ? pino(opcoes, destino) : pino(opcoes);
}

export const logger = criarLogger();

/**
 * Log de acesso: uma linha por requisição, com o request id, sem o corpo e sem credenciais.
 * Respostas 4xx saem como warn e 5xx como error. A verificação de saúde só gera log quando falha.
 */
export function criarLogDeAcesso(base: Logger) {
  return pinoHttp({
    logger: base,
    genReqId: (req) => req.id ?? randomUUID(),
    customLogLevel: (req, res, erro) => {
      const caminho = ((req as { originalUrl?: string }).originalUrl ?? req.url)?.split("?")[0];
      if (!erro && res.statusCode < 400 && caminho === "/api/health") return "silent";
      if (erro || res.statusCode >= 500) return "error";
      if (res.statusCode >= 400) return "warn";
      return "info";
    },
  });
}
