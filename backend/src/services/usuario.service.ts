import { PerfilUsuario, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { env } from "../config/env";
import { prisma } from "../config/prisma";
import { AppError } from "../middlewares/erros";
import { usuarioRepository, UsuarioPublico } from "../repositories/usuario.repository";
import { registrarAuditoria } from "./auditoria.service";
import { gerarSenhaAleatoria } from "./politica-senha";

const ENTIDADE = "usuario";

interface DadosNovoUsuario {
  nome: string;
  email: string;
  perfil: PerfilUsuario;
}

interface DadosAtualizacao {
  nome?: string;
  perfil?: PerfilUsuario;
}

function naoEncontrado() {
  return new AppError("Usuário não encontrado", 404);
}

function conflito(mensagem: string) {
  return new AppError(mensagem, 409);
}

async function buscarOuFalhar(id: number, cliente: Prisma.TransactionClient) {
  const usuario = await usuarioRepository.buscarPorId(id, cliente);
  if (!usuario) {
    throw naoEncontrado();
  }
  return usuario;
}

/**
 * Garante que, sem o alvo, ainda sobra outro administrador ativo. Trava as linhas dos administradores
 * até o fim da transação, para duas remoções simultâneas não deixarem o sistema sem nenhum.
 */
async function exigirOutroAdministradorAtivo(cliente: Prisma.TransactionClient, alvo: UsuarioPublico) {
  if (alvo.perfil !== "ADMINISTRADOR" || !alvo.ativo) {
    return;
  }
  const ativos = await usuarioRepository.travarAdministradoresAtivos(cliente);
  if (!ativos.some((id) => id !== alvo.id)) {
    throw conflito("O PasTrack precisa de pelo menos um administrador ativo");
  }
}

export const usuarioService = {
  listar() {
    return usuarioRepository.listar();
  },

  /** Cria o usuário com uma senha temporária, devolvida uma única vez, e a troca obrigatória ligada. */
  async criar(dados: DadosNovoUsuario, atorId: number) {
    const senhaTemporaria = gerarSenhaAleatoria(dados.email);
    const senhaHash = await bcrypt.hash(senhaTemporaria, env.BCRYPT_CUSTO);
    const usuario = await prisma.$transaction(async (tx) => {
      const criado = await usuarioRepository.criar({ ...dados, senhaHash, deveTrocarSenha: true }, tx);
      await registrarAuditoria(tx, {
        usuarioId: atorId,
        acao: "usuario.criado",
        entidade: ENTIDADE,
        entidadeId: criado.id,
        depois: criado,
      });
      return criado;
    });
    return { ...usuario, senhaTemporaria };
  },

  /**
   * Muda nome e perfil. Mudar o perfil derruba as sessões do usuário. Ninguém rebaixa a si mesmo,
   * nem o último administrador ativo.
   */
  atualizar(id: number, dados: DadosAtualizacao, atorId: number) {
    return prisma.$transaction(async (tx) => {
      const atual = await buscarOuFalhar(id, tx);
      const mudaPerfil = dados.perfil !== undefined && dados.perfil !== atual.perfil;
      if (mudaPerfil && atual.perfil === "ADMINISTRADOR") {
        if (id === atorId) {
          throw conflito("Você não pode rebaixar o seu próprio perfil");
        }
        await exigirOutroAdministradorAtivo(tx, atual);
      }

      const depois = await usuarioRepository.atualizar(
        id,
        { nome: dados.nome, perfil: dados.perfil, ...(mudaPerfil ? { versaoToken: { increment: 1 } } : {}) },
        tx
      );
      await registrarAuditoria(tx, {
        usuarioId: atorId,
        acao: "usuario.atualizado",
        entidade: ENTIDADE,
        entidadeId: id,
        antes: { nome: atual.nome, perfil: atual.perfil },
        depois: { nome: depois.nome, perfil: depois.perfil },
      });
      return depois;
    });
  },

  /**
   * Ativa ou desativa. Desativar derruba as sessões do usuário. Ninguém desativa a si mesmo, nem o
   * último administrador ativo. Repetir o estado atual não muda nada.
   */
  async alterarAtivo(id: number, ativo: boolean, atorId: number) {
    if (!ativo && id === atorId) {
      throw conflito("Você não pode desativar o seu próprio usuário");
    }
    return prisma.$transaction(async (tx) => {
      const atual = await buscarOuFalhar(id, tx);
      if (atual.ativo === ativo) {
        return atual;
      }
      if (!ativo) {
        await exigirOutroAdministradorAtivo(tx, atual);
      }

      const depois = await usuarioRepository.atualizar(
        id,
        { ativo, ...(ativo ? {} : { versaoToken: { increment: 1 } }) },
        tx
      );
      await registrarAuditoria(tx, {
        usuarioId: atorId,
        acao: ativo ? "usuario.reativado" : "usuario.desativado",
        entidade: ENTIDADE,
        entidadeId: id,
        antes: { ativo: atual.ativo },
        depois: { ativo },
      });
      return depois;
    });
  },

  /** Gera outra senha temporária, devolvida uma única vez, liga a troca obrigatória e derruba as sessões. */
  async redefinirSenha(id: number, atorId: number) {
    const alvo = await usuarioRepository.buscarPorId(id);
    if (!alvo) {
      throw naoEncontrado();
    }
    const senhaTemporaria = gerarSenhaAleatoria(alvo.email);
    const senhaHash = await bcrypt.hash(senhaTemporaria, env.BCRYPT_CUSTO);
    await prisma.$transaction(async (tx) => {
      await usuarioRepository.redefinirSenha(id, senhaHash, { cliente: tx });
      await registrarAuditoria(tx, {
        usuarioId: atorId,
        acao: "usuario.senha_redefinida",
        entidade: ENTIDADE,
        entidadeId: id,
        depois: { deveTrocarSenha: true },
      });
    });
    return { senhaTemporaria };
  },
};
