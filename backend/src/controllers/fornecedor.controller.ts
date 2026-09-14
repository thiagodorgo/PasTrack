import { Request, Response } from "express";
import { AtualizarFornecedor, CriarFornecedor } from "../schemas/fornecedor.schema";
import { fornecedorService } from "../services/fornecedor.service";

/** Params e corpo já chegam validados e convertidos pelo validar() das rotas. */
export const fornecedorController = {
  async listar(_req: Request, res: Response) {
    return res.json(await fornecedorService.listar());
  },

  async buscarPorId(req: Request, res: Response) {
    return res.json(await fornecedorService.buscarPorId(Number(req.params.id)));
  },

  async criar(req: Request, res: Response) {
    const fornecedor = await fornecedorService.criar(req.body as CriarFornecedor, req.usuario!.id);
    return res.status(201).json(fornecedor);
  },

  async atualizar(req: Request, res: Response) {
    const dados = req.body as AtualizarFornecedor;
    return res.json(await fornecedorService.atualizar(Number(req.params.id), dados, req.usuario!.id));
  },
};
