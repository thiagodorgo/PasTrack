import { RequestHandler } from "express";
import { randomUUID } from "node:crypto";

/** Só aproveitamos o X-Request-Id recebido quando ele não pode sujar os logs: até 64 letras, números, _ ou -. */
const REQUEST_ID_SEGURO = /^[\w-]{1,64}$/;

export function escolherRequestId(recebido: string | string[] | undefined): string {
  return typeof recebido === "string" && REQUEST_ID_SEGURO.test(recebido) ? recebido : randomUUID();
}

/** Dá um id a cada requisição e o devolve no cabeçalho X-Request-Id, para cruzar a resposta com os logs. */
export const atribuirRequestId: RequestHandler = (req, res, next) => {
  const id = escolherRequestId(req.headers["x-request-id"]);
  req.id = id;
  res.setHeader("X-Request-Id", id);
  next();
};
