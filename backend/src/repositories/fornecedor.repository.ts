import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";

type CamposFornecedor = "nome" | "cnpj" | "contato";
export type NovoFornecedor = Pick<Prisma.FornecedorUncheckedCreateInput, CamposFornecedor>;
export type AlteracaoFornecedor = Pick<Prisma.FornecedorUncheckedUpdateInput, CamposFornecedor>;

export const fornecedorRepository = {
  listar() {
    return prisma.fornecedor.findMany({ orderBy: { nome: "asc" } });
  },

  buscarPorId(id: number) {
    return prisma.fornecedor.findUnique({ where: { id } });
  },

  /** Trava a linha até o fim da transação e devolve o fornecedor como está gravado, ou null. */
  async buscarParaAtualizar(tx: Prisma.TransactionClient, id: number) {
    await tx.$queryRaw`SELECT "id" FROM "fornecedor" WHERE "id" = ${id} FOR UPDATE`;
    return tx.fornecedor.findUnique({ where: { id } });
  },

  criar(tx: Prisma.TransactionClient, dados: NovoFornecedor) {
    return tx.fornecedor.create({ data: dados });
  },

  atualizar(tx: Prisma.TransactionClient, id: number, dados: AlteracaoFornecedor) {
    return tx.fornecedor.update({ where: { id }, data: dados });
  },
};
