import { Router } from "express";
import { movimentacaoController } from "../controllers/movimentacao.controller";
import { autorizar } from "../middlewares/auth";
import { capturar } from "../middlewares/erros";
import { validar } from "../middlewares/validar";
import { registrarMovimentacaoBody } from "../schemas/movimentacao.schema";

export const movimentacaoRotas = Router();

movimentacaoRotas.get("/", capturar(movimentacaoController.listar));
// a restrição de SAÍDA por perfil é aplicada no controller, conforme o tipo enviado
movimentacaoRotas.post(
  "/",
  autorizar("registrarEntrada"),
  validar({ body: registrarMovimentacaoBody }),
  capturar(movimentacaoController.registrar)
);
