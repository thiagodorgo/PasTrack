import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { AppError } from "./erros";

export interface UsuarioToken {
  id: number;
  nome: string;
  perfil: string;
}

export function autenticar(req: Request, _res: Response, next: NextFunction) {
  const cabecalho = req.headers.authorization;
  if (!cabecalho || !cabecalho.startsWith("Bearer ")) {
    throw new AppError("Token não informado", 401);
  }

  try {
    const payload = jwt.verify(cabecalho.slice(7), process.env.JWT_SECRET as string) as UsuarioToken;
    req.usuario = payload;
  } catch {
    throw new AppError("Token inválido ou expirado", 401);
  }

  next();
}

export function autorizar(...perfis: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.usuario || !perfis.includes(req.usuario.perfil)) {
      throw new AppError("Acesso negado para este perfil", 403);
    }
    next();
  };
}
