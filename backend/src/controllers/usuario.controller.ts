import { Request, Response } from "express";
import { usuarioDaRequisicao } from "../middlewares/auth";
import { AlterarAtivoEntrada, AtualizarUsuarioEntrada, CriarUsuarioEntrada } from "../schemas/usuario.schema";
import { usuarioService } from "../services/usuario.service";

export const usuarioController = {
  async listar(_req: Request, res: Response) {
    return res.json(await usuarioService.listar());
  },

  async criar(req: Request, res: Response) {
    const dados = req.body as CriarUsuarioEntrada;
    return res.status(201).json(await usuarioService.criar(dados, usuarioDaRequisicao(req).id));
  },

  async atualizar(req: Request, res: Response) {
    const dados = req.body as AtualizarUsuarioEntrada;
    return res.json(
      await usuarioService.atualizar(Number(req.params.id), dados, usuarioDaRequisicao(req).id)
    );
  },

  async alterarAtivo(req: Request, res: Response) {
    const { ativo } = req.body as AlterarAtivoEntrada;
    return res.json(
      await usuarioService.alterarAtivo(Number(req.params.id), ativo, usuarioDaRequisicao(req).id)
    );
  },

  async redefinirSenha(req: Request, res: Response) {
    return res.json(await usuarioService.redefinirSenha(Number(req.params.id), usuarioDaRequisicao(req).id));
  },
};
