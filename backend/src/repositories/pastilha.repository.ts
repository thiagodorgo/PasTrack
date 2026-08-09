import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";

export const pastilhaRepository = {
  listar(filtro: Prisma.PastilhaWhereInput) {
    return prisma.pastilha.findMany({
      where: filtro,
      include: { fabricante: true },
      orderBy: { descricao: "asc" },
    });
  },

  buscarPorId(id: number) {
    return prisma.pastilha.findUnique({
      where: { id },
      include: { fabricante: true },
    });
  },

  criar(dados: Prisma.PastilhaUncheckedCreateInput) {
    return prisma.pastilha.create({ data: dados, include: { fabricante: true } });
  },

  atualizar(id: number, dados: Prisma.PastilhaUncheckedUpdateInput) {
    return prisma.pastilha.update({ where: { id }, data: dados, include: { fabricante: true } });
  },

  listarCriticas() {
    return prisma.pastilha.findMany({
      where: { saldoAtual: { lte: prisma.pastilha.fields.estoqueMinimo } },
      orderBy: { saldoAtual: "asc" },
    });
  },
};
