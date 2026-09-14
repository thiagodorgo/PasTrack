import { PerfilUsuario } from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { Acao, pode } from "../config/permissoes";
import { AppError } from "./erros";

export interface UsuarioToken {
  id: number;
  nome: string;
  perfil: PerfilUsuario;
}

export function autenticar(req: Request, _res: Response, next: NextFunction) {
  const cabecalho = req.headers.authorization;
  if (!cabecalho || !cabecalho.startsWith("Bearer ")) {
    throw new AppError("Token não informado", 401);
  }

  try {
    req.usuario = jwt.verify(cabecalho.slice(7), env.JWT_SECRET) as UsuarioToken;
  } catch {
    throw new AppError("Token inválido ou expirado", 401);
  }

  next();
}

/** Libera a rota só para os perfis que podem executar a ação, conforme config/permissoes.ts. */
export function autorizar(acao: Acao) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.usuario || !pode(req.usuario.perfil, acao)) {
      throw new AppError("Acesso negado para este perfil", 403);
    }
    next();
  };
}
