import { Router } from "express";
import { authController } from "../controllers/auth.controller";
import { capturar } from "../middlewares/erros";
import { limitarLogin } from "../middlewares/rate-limit";
import { validar } from "../middlewares/validar";
import { loginSchema } from "../schemas/auth.schema";

export const authRotas = Router();

authRotas.post("/login", limitarLogin, validar({ body: loginSchema }), capturar(authController.login));
