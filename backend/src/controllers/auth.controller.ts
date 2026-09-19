import { Request, Response } from "express";
import { usuarioDaRequisicao } from "../middlewares/auth";
import { AppError } from "../middlewares/erros";
import { marcarFalhaDeCredencial } from "../middlewares/rate-limit";
import { LoginEntrada, TrocarSenhaEntrada } from "../schemas/auth.schema";
import { authService } from "../services/auth.service";

export const authController = {
  async login(req: Request, res: Response) {
    const { email, senha } = req.body as LoginEntrada;
    return res.json(await authService.login(email, senha));
  },

  async me(req: Request, res: Response) {
    return res.json(await authService.me(usuarioDaRequisicao(req).id));
  },

  async trocarSenha(req: Request, res: Response) {
    const { senhaAtual, novaSenha } = req.body as TrocarSenhaEntrada;
    const { id, versaoToken } = usuarioDaRequisicao(req);
    try {
      return res.json(await authService.trocarSenha(id, versaoToken, senhaAtual, novaSenha));
    } catch (erro) {
      // só a senha atual errada conta no limite de tentativas da troca
      if (erro instanceof AppError && erro.codigo === "SENHA_ATUAL_INCORRETA") {
        marcarFalhaDeCredencial(res);
      }
      throw erro;
    }
  },
};
