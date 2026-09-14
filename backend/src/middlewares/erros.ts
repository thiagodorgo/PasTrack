import { NextFunction, Request, RequestHandler, Response } from "express";
import { ZodError } from "zod";

export class AppError extends Error {
  constructor(
    message: string,
    public status = 400
  ) {
    super(message);
  }
}

// envolve controllers assíncronos para que erros caiam no tratador
export const capturar =
  (fn: RequestHandler): RequestHandler =>
  (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

/** Erros do express.json(): corpo malformado ou grande demais. */
function erroDoCorpo(erro: Error): { status: number; mensagem: string } | null {
  const tipo = (erro as { type?: unknown }).type;
  if (tipo === "entity.parse.failed") return { status: 400, mensagem: "JSON malformado" };
  if (tipo === "entity.too.large") return { status: 413, mensagem: "Corpo da requisição grande demais" };
  return null;
}

export function tratarErros(erro: Error, _req: Request, res: Response, _next: NextFunction) {
  if (erro instanceof AppError) {
    return res.status(erro.status).json({ erro: erro.message });
  }
  if (erro instanceof ZodError) {
    return res.status(400).json({
      erro: "Dados inválidos",
      campos: erro.issues.map((problema) => ({
        caminho: problema.path.map(String).join("."),
        mensagem: problema.message,
      })),
    });
  }
  const corpo = erroDoCorpo(erro);
  if (corpo) {
    return res.status(corpo.status).json({ erro: corpo.mensagem });
  }
  console.error(erro);
  return res.status(500).json({ erro: "Erro interno no servidor" });
}
