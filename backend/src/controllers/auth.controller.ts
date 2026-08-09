import { Request, Response } from "express";
import { AppError } from "../middlewares/erros";
import { authService } from "../services/auth.service";

export const authController = {
  async login(req: Request, res: Response) {
    const { email, senha } = req.body;
    if (!email || !senha) {
      throw new AppError("Informe e-mail e senha");
    }
    const resultado = await authService.login(email, senha);
    return res.json(resultado);
  },
};
