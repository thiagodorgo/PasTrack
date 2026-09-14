import { Router } from "express";
import { alertaController } from "../controllers/alerta.controller";
import { autorizar } from "../middlewares/auth";
import { capturar } from "../middlewares/erros";
import { validar } from "../middlewares/validar";
import { listarAlertasQuery } from "../schemas/alerta.schema";
import { idParam } from "../schemas/comum.schema";

export const alertaRotas = Router();

alertaRotas.get("/", validar({ query: listarAlertasQuery }), capturar(alertaController.listar));
alertaRotas.patch(
  "/:id/resolver",
  autorizar("resolverAlerta"),
  validar({ params: idParam }),
  capturar(alertaController.resolver)
);
