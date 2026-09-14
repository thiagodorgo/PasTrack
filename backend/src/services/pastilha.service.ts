import { prisma } from "../config/prisma";
import { AppError } from "../middlewares/erros";
import { FiltroPastilhas, pastilhaRepository } from "../repositories/pastilha.repository";
import { AtualizarPastilha, CriarPastilha } from "../schemas/pastilha.schema";
import { registrarAuditoria } from "./auditoria.service";
import { avaliarAlerta } from "./estoque/avaliar-alerta";

const naoEncontrada = () => new AppError("Pastilha não encontrada", 404, "NAO_ENCONTRADO");

export const pastilhaService = {
  listar(filtro: FiltroPastilhas = {}) {
    return pastilhaRepository.listar(filtro);
  },

  async buscarPorId(id: number) {
    const pastilha = await pastilhaRepository.buscarPorId(id);
    if (!pastilha) throw naoEncontrada();
    return pastilha;
  },

  /** A pastilha nasce com saldo 0. O alerta é avaliado na mesma transação e abre se o saldo estiver no mínimo. */
  criar(dados: CriarPastilha, usuarioId: number) {
    return prisma.$transaction(async (tx) => {
      const { fabricante, ...pastilha } = await pastilhaRepository.criar(tx, {
        codigo: dados.codigo,
        descricao: dados.descricao,
        modelo: dados.modelo,
        aplicacao: dados.aplicacao,
        unidade: dados.unidade,
        estoqueMinimo: dados.estoqueMinimo,
        fabricanteId: dados.fabricanteId,
      });
      await registrarAuditoria(tx, {
        usuarioId,
        acao: "pastilha.criada",
        entidade: "pastilha",
        entidadeId: pastilha.id,
        depois: pastilha,
      });
      await avaliarAlerta(tx, pastilha.id, usuarioId);
      return { ...pastilha, fabricante };
    });
  },

  /** Código e saldo nunca mudam aqui. Se o estoque mínimo mudar, o alerta é reavaliado na mesma transação. */
  atualizar(id: number, dados: AtualizarPastilha, usuarioId: number) {
    return prisma.$transaction(async (tx) => {
      const antes = await pastilhaRepository.buscarParaAtualizar(tx, id);
      if (!antes) throw naoEncontrada();

      const { fabricante, ...depois } = await pastilhaRepository.atualizar(tx, id, {
        descricao: dados.descricao,
        modelo: dados.modelo,
        aplicacao: dados.aplicacao,
        unidade: dados.unidade,
        estoqueMinimo: dados.estoqueMinimo,
        fabricanteId: dados.fabricanteId,
      });
      await registrarAuditoria(tx, {
        usuarioId,
        acao: "pastilha.atualizada",
        entidade: "pastilha",
        entidadeId: id,
        antes,
        depois,
      });
      if (depois.estoqueMinimo !== antes.estoqueMinimo) {
        await avaliarAlerta(tx, id, usuarioId);
      }
      return { ...depois, fabricante };
    });
  },
};
