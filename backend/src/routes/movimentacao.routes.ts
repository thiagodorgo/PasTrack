import { NextFunction, Request, Response, Router } from "express";
import { pode } from "../config/permissoes";
import { movimentacaoController } from "../controllers/movimentacao.controller";
import { autorizar } from "../middlewares/auth";
import { AppError, capturar } from "../middlewares/erros";
import { validar } from "../middlewares/validar";
import { listarMovimentacoesQuery, registrarMovimentacaoBody } from "../schemas/movimentacao.schema";

export const movimentacaoRotas = Router();

/**
 * O COMPRADOR só registra ENTRADA. A recusa vem antes da validação do corpo, para que a SAIDA de
 * quem não pode registrá-la receba sempre 403, mesmo com os outros campos inválidos.
 */
function recusarSaidaSemPermissao(req: Request, _res: Response, next: NextFunction) {
  if (req.body?.tipo === "SAIDA" && !pode(req.usuario!.perfil, "registrarSaida")) {
    throw new AppError("Seu perfil só pode registrar entradas", 403);
  }
  next();
}

movimentacaoRotas.get(
  "/",
  validar({ query: listarMovimentacoesQuery }),
  capturar(movimentacaoController.listar)
);
movimentacaoRotas.post(
  "/",
  autorizar("registrarEntrada"),
  recusarSaidaSemPermissao,
  validar({ body: registrarMovimentacaoBody }),
  capturar(movimentacaoController.registrar)
);
