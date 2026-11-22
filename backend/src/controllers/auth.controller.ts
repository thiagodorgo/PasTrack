import { Request, Response } from "express";
import { usuarioDaRequisicao } from "../middlewares/auth";
import { AppError } from "../middlewares/erros";
import { marcarFalhaDeCredencial } from "../middlewares/rate-limit";
import { LoginEntrada, TrocarSenhaEntrada } from "../schemas/auth.schema";
import { authService } from "../services/auth.service";

/** Login e sessão do próprio usuário. O corpo chega validado pelo validar() das rotas. */
export const authController = {
  /** POST /api/auth/login: devolve o token e os dados do usuário. */
  async login(req: Request, res: Response) {
    const { email, senha } = req.body as LoginEntrada;
    return res.json(await authService.login(email, senha));
  },

  /** GET /api/auth/me: dados do usuário da sessão, no mesmo formato do login. */
  async me(req: Request, res: Response) {
    return res.json(await authService.me(usuarioDaRequisicao(req).id));
  },

  /**
   * PATCH /api/auth/senha: troca a senha do próprio usuário e devolve um token novo. Quando a senha atual
   * está errada, marca a resposta para o limitarTrocaDeSenha contar a tentativa.
   */
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
