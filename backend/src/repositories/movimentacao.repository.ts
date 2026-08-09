import { prisma } from "../config/prisma";

export const movimentacaoRepository = {
  listar(pastilhaId?: number) {
    return prisma.movimentacao.findMany({
      where: pastilhaId ? { pastilhaId } : undefined,
      include: {
        pastilha: { select: { codigo: true, descricao: true, unidade: true } },
        usuario: { select: { nome: true } },
        fornecedor: { select: { nome: true } },
      },
      orderBy: { dataHora: "desc" },
      take: 100,
    });
  },
};
