import { Request, Response } from "express";
import { ConsultaMovimentacoes, RegistrarMovimentacao } from "../schemas/movimentacao.schema";
import { movimentacaoService } from "../services/movimentacao.service";

// body e query chegam validados e convertidos pela rota (schemas/movimentacao.schema.ts), que
// também já recusou a SAIDA de quem só pode registrar ENTRADA
export const movimentacaoController = {
  async listar(req: Request, res: Response) {
    const consulta = req.query as unknown as ConsultaMovimentacoes;
    return res.json(await movimentacaoService.listar(consulta));
  },

  async registrar(req: Request, res: Response) {
    const dados = req.body as RegistrarMovimentacao;
    const resultado = await movimentacaoService.registrar({ ...dados, usuarioId: req.usuario!.id });
    return res.status(201).json(resultado);
  },
};
