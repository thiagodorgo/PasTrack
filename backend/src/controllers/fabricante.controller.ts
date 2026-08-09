import { Request, Response } from "express";
import { AppError } from "../middlewares/erros";
import { fabricanteService } from "../services/fabricante.service";

export const fabricanteController = {
  async listar(_req: Request, res: Response) {
    return res.json(await fabricanteService.listar());
  },

  async criar(req: Request, res: Response) {
    const { nome } = req.body;
    if (!nome) {
      throw new AppError("Informe o nome do fabricante");
    }
    return res.status(201).json(await fabricanteService.criar(nome));
  },
};
