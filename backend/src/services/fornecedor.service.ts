import { prisma } from "../config/prisma";
import { AppError } from "../middlewares/erros";
import { fornecedorRepository } from "../repositories/fornecedor.repository";
import { AtualizarFornecedor, CriarFornecedor } from "../schemas/fornecedor.schema";
import { registrarAuditoria } from "./auditoria.service";

const naoEncontrado = () => new AppError("Fornecedor não encontrado", 404, "NAO_ENCONTRADO");

export const fornecedorService = {
  listar() {
    return fornecedorRepository.listar();
  },

  async buscarPorId(id: number) {
    const fornecedor = await fornecedorRepository.buscarPorId(id);
    if (!fornecedor) throw naoEncontrado();
    return fornecedor;
  },

  criar(dados: CriarFornecedor, usuarioId: number) {
    return prisma.$transaction(async (tx) => {
      const fornecedor = await fornecedorRepository.criar(tx, {
        nome: dados.nome,
        cnpj: dados.cnpj,
        contato: dados.contato,
      });
      await registrarAuditoria(tx, {
        usuarioId,
        acao: "fornecedor.criado",
        entidade: "fornecedor",
        entidadeId: fornecedor.id,
        depois: fornecedor,
      });
      return fornecedor;
    });
  },

  /** Atualização parcial: campo ausente fica como está; cnpj ou contato null (ou vazio) limpa o valor. */
  atualizar(id: number, dados: AtualizarFornecedor, usuarioId: number) {
    return prisma.$transaction(async (tx) => {
      const antes = await fornecedorRepository.buscarParaAtualizar(tx, id);
      if (!antes) throw naoEncontrado();

      const depois = await fornecedorRepository.atualizar(tx, id, {
        nome: dados.nome,
        cnpj: dados.cnpj,
        contato: dados.contato,
      });
      await registrarAuditoria(tx, {
        usuarioId,
        acao: "fornecedor.atualizado",
        entidade: "fornecedor",
        entidadeId: id,
        antes,
        depois,
      });
      return depois;
    });
  },
};
