import { Request, Response } from "express";
import { AppError } from "../middlewares/erros";
import { movimentacaoService } from "../services/movimentacao.service";

export const movimentacaoController = {
  async listar(req: Request, res: Response) {
    const pastilhaId = req.query.pastilhaId ? Number(req.query.pastilhaId) : undefined;
    const movimentacoes = await movimentacaoService.listar(pastilhaId);
    return res.json(movimentacoes);
  },

  async registrar(req: Request, res: Response) {
    const { tipo, pastilhaId, quantidade, fornecedorId, documento, observacao } = req.body;

    if (tipo !== "ENTRADA" && tipo !== "SAIDA") {
      throw new AppError("Tipo de movimentação inválido");
    }
    if (!pastilhaId || !quantidade) {
      throw new AppError("Informe a pastilha e a quantidade");
    }

    const resultado = await movimentacaoService.registrar({
      tipo,
      pastilhaId: Number(pastilhaId),
      quantidade: Number(quantidade),
      usuarioId: req.usuario!.id,
      fornecedorId: fornecedorId ? Number(fornecedorId) : undefined,
      documento,
      observacao,
    });

    return res.status(201).json(resultado);
  },
};
