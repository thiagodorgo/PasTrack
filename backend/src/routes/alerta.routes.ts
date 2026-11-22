import { Router } from "express";
import { alertaController } from "../controllers/alerta.controller";
import { autorizar } from "../middlewares/auth";
import { capturar } from "../middlewares/erros";
import { validar } from "../middlewares/validar";
import { alertaIdParam, listarAlertasQuery } from "../schemas/alerta.schema";

/**
 * Rotas de /api/alertas, montadas depois do autenticar e do exigirSenhaAtualizada.
 * - GET /: qualquer perfil autenticado. Filtra por situação (padrão ABERTO) e aceita página.
 * - PATCH /:id/resolver: permissão resolverAlerta (ADMINISTRADOR e GESTOR).
 */
export const alertaRotas = Router();

alertaRotas.get("/", validar({ query: listarAlertasQuery }), capturar(alertaController.listar));
alertaRotas.patch(
  "/:id/resolver",
  autorizar("resolverAlerta"),
  validar({ params: alertaIdParam }),
  capturar(alertaController.resolver)
);
