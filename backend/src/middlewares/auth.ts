import { PerfilUsuario } from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import { Acao, pode } from "../config/permissoes";
import { usuarioRepository } from "../repositories/usuario.repository";
import { sessaoInvalida, verificarToken } from "../services/auth.service";
import { AppError, capturar } from "./erros";

/** Usuário da requisição, recarregado do banco a cada chamada: o token só diz quem é e qual versão. */
export interface UsuarioAutenticado {
  id: number;
  nome: string;
  perfil: PerfilUsuario;
  deveTrocarSenha: boolean;
}

const CABECALHO_BEARER = /^Bearer\s+(\S+)$/i;

/**
 * Exige um token válido e revalida a sessão no banco: o usuário precisa existir, estar ativo e ter a
 * mesma versão de token. Trocar a senha, mudar o perfil ou desativar o usuário incrementa a versão e
 * derruba os tokens emitidos antes.
 */
export const autenticar = capturar(async (req: Request, _res: Response, next: NextFunction) => {
  const token = CABECALHO_BEARER.exec(req.headers.authorization ?? "")?.[1];
  if (!token) {
    throw new AppError("Token não informado", 401, "TOKEN_AUSENTE");
  }

  let sessao: { id: number; versaoToken: number };
  try {
    sessao = verificarToken(token);
  } catch {
    throw sessaoInvalida();
  }

  const usuario = await usuarioRepository.buscarSessao(sessao.id);
  if (!usuario || !usuario.ativo || usuario.versaoToken !== sessao.versaoToken) {
    throw sessaoInvalida();
  }

  req.usuario = {
    id: usuario.id,
    nome: usuario.nome,
    perfil: usuario.perfil,
    deveTrocarSenha: usuario.deveTrocarSenha,
  };
  next();
});

/** Usuário autenticado da requisição. Só vale depois de autenticar. */
export function usuarioDaRequisicao(req: Request): UsuarioAutenticado {
  if (!req.usuario) {
    throw sessaoInvalida();
  }
  return req.usuario;
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
