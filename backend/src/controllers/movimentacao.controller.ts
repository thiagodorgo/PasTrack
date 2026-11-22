import { Request, Response } from "express";
import { ConsultaMovimentacoes, RegistrarMovimentacao } from "../schemas/movimentacao.schema";
import { movimentacaoService } from "../services/movimentacao.service";

/**
 * Movimentações de estoque. Body e query chegam validados e convertidos pela rota
 * (schemas/movimentacao.schema.ts), que também já recusou a SAIDA de quem só pode registrar ENTRADA.
 */
export const movimentacaoController = {
  /** GET /api/movimentacoes: histórico filtrado, com ou sem página. */
  async listar(req: Request, res: Response) {
    const consulta = req.query as unknown as ConsultaMovimentacoes;
    return res.json(await movimentacaoService.listar(consulta));
  },

  /** POST /api/movimentacoes: registra a ENTRADA ou a SAIDA em nome do usuário logado e responde 201. */
  async registrar(req: Request, res: Response) {
    const dados = req.body as RegistrarMovimentacao;
    const resultado = await movimentacaoService.registrar({ ...dados, usuarioId: req.usuario!.id });
    return res.status(201).json(resultado);
  },
};
