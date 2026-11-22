import { Request, Response } from "express";
import { usuarioDaRequisicao } from "../middlewares/auth";
import { AlterarAtivoEntrada, AtualizarUsuarioEntrada, CriarUsuarioEntrada } from "../schemas/usuario.schema";
import { usuarioService } from "../services/usuario.service";

/**
 * Gestão de usuários pelo administrador. Params e corpo chegam validados pelo validar() das rotas.
 * O usuário logado vai para o serviço como ator, para a auditoria e para as regras sobre si mesmo.
 */
export const usuarioController = {
  /** GET /api/usuarios: lista todos os usuários. */
  async listar(_req: Request, res: Response) {
    return res.json(await usuarioService.listar());
  },

  /** POST /api/usuarios: responde 201 com a senha temporária, mostrada uma única vez. */
  async criar(req: Request, res: Response) {
    const dados = req.body as CriarUsuarioEntrada;
    return res.status(201).json(await usuarioService.criar(dados, usuarioDaRequisicao(req).id));
  },

  /** PUT /api/usuarios/:id: muda nome e perfil. */
  async atualizar(req: Request, res: Response) {
    const dados = req.body as AtualizarUsuarioEntrada;
    return res.json(
      await usuarioService.atualizar(Number(req.params.id), dados, usuarioDaRequisicao(req).id)
    );
  },

  /** PATCH /api/usuarios/:id/ativo: ativa ou desativa o usuário. */
  async alterarAtivo(req: Request, res: Response) {
    const { ativo } = req.body as AlterarAtivoEntrada;
    return res.json(
      await usuarioService.alterarAtivo(Number(req.params.id), ativo, usuarioDaRequisicao(req).id)
    );
  },

  /** POST /api/usuarios/:id/redefinir-senha: gera outra senha temporária para o usuário. */
  async redefinirSenha(req: Request, res: Response) {
    return res.json(await usuarioService.redefinirSenha(Number(req.params.id), usuarioDaRequisicao(req).id));
  },
};
