import { NextFunction, Request, RequestHandler, Response } from "express";

export class AppError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

// envolve controllers assíncronos para que erros caiam no tratador
export const capturar =
  (fn: RequestHandler): RequestHandler =>
  (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

export function tratarErros(erro: Error, _req: Request, res: Response, _next: NextFunction) {
  if (erro instanceof AppError) {
    return res.status(erro.status).json({ erro: erro.message });
  }
  console.error(erro);
  return res.status(500).json({ erro: "Erro interno no servidor" });
}
