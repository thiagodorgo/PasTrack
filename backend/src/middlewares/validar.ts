import { RequestHandler } from "express";
import { ZodType } from "zod";

interface Esquemas {
  body?: ZodType;
  params?: ZodType;
  query?: ZodType;
}

/**
 * Valida body, params e query com zod e troca os valores pelos já convertidos.
 * Campos fora do esquema e tipos errados viram 400 no tratador de erros.
 */
export function validar(esquemas: Esquemas): RequestHandler {
  return (req, _res, next) => {
    if (esquemas.params) req.params = esquemas.params.parse(req.params) as typeof req.params;
    if (esquemas.query) req.query = esquemas.query.parse(req.query) as typeof req.query;
    if (esquemas.body) req.body = esquemas.body.parse(req.body);
    next();
  };
}
