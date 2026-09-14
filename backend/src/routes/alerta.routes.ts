import { Router } from "express";
import { alertaController } from "../controllers/alerta.controller";
import { autorizar } from "../middlewares/auth";
import { capturar } from "../middlewares/erros";

export const alertaRotas = Router();

alertaRotas.get("/", capturar(alertaController.listar));
alertaRotas.patch("/:id/resolver", autorizar("resolverAlerta"), capturar(alertaController.resolver));
