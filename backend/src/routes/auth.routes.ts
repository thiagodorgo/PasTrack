import { Router } from "express";
import { authController } from "../controllers/auth.controller";
import { autenticar } from "../middlewares/auth";
import { capturar } from "../middlewares/erros";
import { limitarLogin, limitarPorUsuario, limitarTrocaDeSenha } from "../middlewares/rate-limit";
import { validar } from "../middlewares/validar";
import { loginSchema, trocarSenhaSchema } from "../schemas/auth.schema";

export const authRotas = Router();

authRotas.post("/login", limitarLogin, validar({ body: loginSchema }), capturar(authController.login));

// Sessão: só autenticar, sem exigir a senha atualizada, porque é por aqui que a troca obrigatória acontece.
authRotas.get("/me", autenticar, limitarPorUsuario, capturar(authController.me));
authRotas.patch(
  "/senha",
  autenticar,
  limitarPorUsuario,
  limitarTrocaDeSenha,
  validar({ body: trocarSenhaSchema }),
  capturar(authController.trocarSenha)
);
