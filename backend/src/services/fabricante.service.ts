import { prisma } from "../config/prisma";
import { AppError } from "../middlewares/erros";
import { fabricanteRepository } from "../repositories/fabricante.repository";
import { DadosFabricante } from "../schemas/fabricante.schema";
import { registrarAuditoria } from "./auditoria.service";

const naoEncontrado = () => new AppError("Fabricante não encontrado", 404, "NAO_ENCONTRADO");

export const fabricanteService = {
  listar() {
    return fabricanteRepository.listar();
  },

  async buscarPorId(id: number) {
    const fabricante = await fabricanteRepository.buscarPorId(id);
    if (!fabricante) throw naoEncontrado();
    return fabricante;
  },

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
