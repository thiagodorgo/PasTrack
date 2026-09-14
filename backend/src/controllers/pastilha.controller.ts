import { Request, Response } from "express";
import { AtualizarPastilha, ConsultaPastilhas, CriarPastilha } from "../schemas/pastilha.schema";
import { pastilhaService } from "../services/pastilha.service";

/** Params, query e corpo já chegam validados e convertidos pelo validar() das rotas. */
export const pastilhaController = {
  async listar(req: Request, res: Response) {
    const filtro = req.query as ConsultaPastilhas;
    return res.json(await pastilhaService.listar(filtro));
  },

  async buscarPorId(req: Request, res: Response) {
    return res.json(await pastilhaService.buscarPorId(Number(req.params.id)));
  },

  async criar(req: Request, res: Response) {
    const pastilha = await pastilhaService.criar(req.body as CriarPastilha, req.usuario!.id);
    return res.status(201).json(pastilha);
  },

  async atualizar(req: Request, res: Response) {
    const dados = req.body as AtualizarPastilha;
    return res.json(await pastilhaService.atualizar(Number(req.params.id), dados, req.usuario!.id));
  },
};
