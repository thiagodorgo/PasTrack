import { prisma } from "../config/prisma";
import { AppError } from "../middlewares/erros";
import { fabricanteRepository } from "../repositories/fabricante.repository";
import { DadosFabricante } from "../schemas/fabricante.schema";
import { registrarAuditoria } from "./auditoria.service";

const naoEncontrado = () => new AppError("Fabricante não encontrado", 404, "NAO_ENCONTRADO");

/**
 * Regras do cadastro de fabricantes. Criação e atualização gravam a auditoria na mesma transação.
 * Nome repetido viola a chave única do banco e sai como 409 DUPLICADO pelo tratarErros.
 */
export const fabricanteService = {
  /** Todos os fabricantes, em ordem de nome. */
  listar() {
    return fabricanteRepository.listar();
  },

  /** Lança 404 NAO_ENCONTRADO quando o id não existe. */
  async buscarPorId(id: number) {
    const fabricante = await fabricanteRepository.buscarPorId(id);
    if (!fabricante) throw naoEncontrado();
    return fabricante;
  },

  /** Cria o fabricante e registra fabricante.criado na auditoria. */
  criar(dados: DadosFabricante, usuarioId: number) {
    return prisma.$transaction(async (tx) => {
      const fabricante = await fabricanteRepository.criar(tx, { nome: dados.nome });
      await registrarAuditoria(tx, {
        usuarioId,
        acao: "fabricante.criado",
        entidade: "fabricante",
        entidadeId: fabricante.id,
        depois: fabricante,
      });
      return fabricante;
    });
  },

  /**
   * Trava a linha do fabricante, troca o nome e registra fabricante.atualizado com o antes e o depois.
   * Lança 404 NAO_ENCONTRADO quando o id não existe.
   */
  atualizar(id: number, dados: DadosFabricante, usuarioId: number) {
    return prisma.$transaction(async (tx) => {
      const antes = await fabricanteRepository.buscarParaAtualizar(tx, id);
      if (!antes) throw naoEncontrado();

      const depois = await fabricanteRepository.atualizar(tx, id, { nome: dados.nome });
      await registrarAuditoria(tx, {
        usuarioId,
        acao: "fabricante.atualizado",
        entidade: "fabricante",
        entidadeId: id,
        antes,
        depois,
      });
      return depois;
    });
  },
};
