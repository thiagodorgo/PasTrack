import { Router } from "express";
import { authController } from "../controllers/auth.controller";
import { capturar } from "../middlewares/erros";
import { limitarLogin } from "../middlewares/rate-limit";

export const authRotas = Router();

authRotas.post("/login", limitarLogin, capturar(authController.login));
