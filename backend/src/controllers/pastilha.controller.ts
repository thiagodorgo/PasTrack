import { Request, Response } from "express";
import { AppError } from "../middlewares/erros";
import { pastilhaService } from "../services/pastilha.service";

export const pastilhaController = {
  async listar(req: Request, res: Response) {
    const busca = typeof req.query.busca === "string" ? req.query.busca : undefined;
    const pastilhas = await pastilhaService.listar(busca);
    return res.json(pastilhas);
  },

  async buscarPorId(req: Request, res: Response) {
    const pastilha = await pastilhaService.buscarPorId(Number(req.params.id));
    return res.json(pastilha);
  },

  async criar(req: Request, res: Response) {
    const { codigo, descricao, fabricanteId } = req.body;
    if (!codigo || !descricao || !fabricanteId) {
      throw new AppError("Código, descrição e fabricante são obrigatórios");
    }
    const pastilha = await pastilhaService.criar(req.body);
    return res.status(201).json(pastilha);
  },

  async atualizar(req: Request, res: Response) {
    const pastilha = await pastilhaService.atualizar(Number(req.params.id), req.body);
    return res.json(pastilha);
  },
};
