import { Router } from "express";
import { movimentacaoController } from "../controllers/movimentacao.controller";
import { autorizar } from "../middlewares/auth";
import { capturar } from "../middlewares/erros";

export const movimentacaoRotas = Router();

movimentacaoRotas.get("/", capturar(movimentacaoController.listar));
// a restrição de SAÍDA por perfil é aplicada no controller, conforme o tipo enviado
movimentacaoRotas.post("/", autorizar("registrarEntrada"), capturar(movimentacaoController.registrar));
