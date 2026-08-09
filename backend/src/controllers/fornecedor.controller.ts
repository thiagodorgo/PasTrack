import { Request, Response } from "express";
import { AppError } from "../middlewares/erros";
import { fornecedorService } from "../services/fornecedor.service";

export const fornecedorController = {
  async listar(_req: Request, res: Response) {
    return res.json(await fornecedorService.listar());
  },

  async criar(req: Request, res: Response) {
    const { nome, cnpj, contato } = req.body;
    if (!nome) {
      throw new AppError("Informe o nome do fornecedor");
    }
    return res.status(201).json(await fornecedorService.criar({ nome, cnpj, contato }));
  },
};
