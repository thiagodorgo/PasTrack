import { Request, Response } from "express";
import { DadosFabricante } from "../schemas/fabricante.schema";
import { fabricanteService } from "../services/fabricante.service";

/** Params e corpo já chegam validados e convertidos pelo validar() das rotas. */
export const fabricanteController = {
  async listar(_req: Request, res: Response) {
    return res.json(await fabricanteService.listar());
  },

  async buscarPorId(req: Request, res: Response) {
    return res.json(await fabricanteService.buscarPorId(Number(req.params.id)));
  },

  async criar(req: Request, res: Response) {
    const fabricante = await fabricanteService.criar(req.body as DadosFabricante, req.usuario!.id);
    return res.status(201).json(fabricante);
  },

  async atualizar(req: Request, res: Response) {
    const dados = req.body as DadosFabricante;
    return res.json(await fabricanteService.atualizar(Number(req.params.id), dados, req.usuario!.id));
  },
};
