import { Router } from "express";
import { authController } from "../controllers/auth.controller";
import { capturar } from "../middlewares/erros";

export const authRotas = Router();

authRotas.post("/login", capturar(authController.login));
