import { NextFunction, Request, Response } from "express";
import { usuarioDaRequisicao } from "./auth";
import { AppError } from "./erros";

/**
 * Bloqueia quem ainda usa a senha inicial ou uma senha redefinida pelo administrador. Fica depois de
 * autenticar em todas as rotas, menos GET /api/auth/me e PATCH /api/auth/senha, que servem à troca.
 */
export function exigirSenhaAtualizada(req: Request, _res: Response, next: NextFunction) {
  if (usuarioDaRequisicao(req).deveTrocarSenha) {
    throw new AppError("Troque a sua senha para continuar", 403, "TROCA_SENHA_OBRIGATORIA");
  }
  next();
}
