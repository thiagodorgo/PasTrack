import { Request, Response } from "express";
import { pode } from "../config/permissoes";
import { AppError } from "../middlewares/erros";
import { RegistrarMovimentacao } from "../schemas/movimentacao.schema";
import { movimentacaoService } from "../services/movimentacao.service";

export const movimentacaoController = {
  async listar(req: Request, res: Response) {
    const pastilhaId = req.query.pastilhaId ? Number(req.query.pastilhaId) : undefined;
    const movimentacoes = await movimentacaoService.listar(pastilhaId);
    return res.json(movimentacoes);
  },

  /** O corpo chega validado e convertido pela rota (schemas/movimentacao.schema.ts). */
  async registrar(req: Request, res: Response) {
    const dados = req.body as RegistrarMovimentacao;
    const usuario = req.usuario!;
    if (dados.tipo === "SAIDA" && !pode(usuario.perfil, "registrarSaida")) {
      throw new AppError("Seu perfil só pode registrar entradas", 403);
    }

    const resultado = await movimentacaoService.registrar({ ...dados, usuarioId: usuario.id });
    return res.status(201).json(resultado);
  },
};
