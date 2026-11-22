import { Router } from "express";
import { painelController } from "../controllers/painel.controller";
import { capturar } from "../middlewares/erros";

/**
 * Rotas de /api/painel, montadas depois do autenticar e do exigirSenhaAtualizada.
 * - GET /resumo: qualquer perfil autenticado.
 */
export const painelRotas = Router();

painelRotas.get("/resumo", capturar(painelController.resumo));
