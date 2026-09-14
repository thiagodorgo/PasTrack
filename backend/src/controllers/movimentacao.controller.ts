import { Request, Response } from "express";
import { pode } from "../config/permissoes";
import { AppError } from "../middlewares/erros";
import { ConsultaMovimentacoes, RegistrarMovimentacao } from "../schemas/movimentacao.schema";
import { movimentacaoService } from "../services/movimentacao.service";

// body e query chegam validados e convertidos pela rota (schemas/movimentacao.schema.ts)
export const movimentacaoController = {
  async listar(req: Request, res: Response) {
    const consulta = req.query as unknown as ConsultaMovimentacoes;
    return res.json(await movimentacaoService.listar(consulta));
  },

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
