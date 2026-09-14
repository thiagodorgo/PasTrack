import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";

type DadosFabricante = Pick<Prisma.FabricanteUncheckedCreateInput, "nome">;

export const fabricanteRepository = {
  listar() {
    return prisma.fabricante.findMany({ orderBy: { nome: "asc" } });
  },

  buscarPorId(id: number) {
    return prisma.fabricante.findUnique({ where: { id } });
  },

  /** Trava a linha até o fim da transação e devolve o fabricante como está gravado, ou null. */
  async buscarParaAtualizar(tx: Prisma.TransactionClient, id: number) {
    await tx.$queryRaw`SELECT "id" FROM "fabricante" WHERE "id" = ${id} FOR UPDATE`;
    return tx.fabricante.findUnique({ where: { id } });
  },

  criar(tx: Prisma.TransactionClient, dados: DadosFabricante) {
    return tx.fabricante.create({ data: dados });
  },

  atualizar(tx: Prisma.TransactionClient, id: number, dados: DadosFabricante) {
    return tx.fabricante.update({ where: { id }, data: dados });
  },
};
