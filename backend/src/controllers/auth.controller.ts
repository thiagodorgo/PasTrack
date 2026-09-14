import { Request, Response } from "express";
import { LoginEntrada } from "../schemas/auth.schema";
import { authService } from "../services/auth.service";

export const authController = {
  async login(req: Request, res: Response) {
    const { email, senha } = req.body as LoginEntrada;
    return res.json(await authService.login(email, senha));
  },
};
