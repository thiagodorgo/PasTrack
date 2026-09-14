import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";

/** Relações devolvidas com cada movimentação, na listagem e no painel. */
export const detalhesDaMovimentacao = {
  pastilha: { select: { codigo: true, descricao: true, unidade: true } },
  usuario: { select: { nome: true } },
  fornecedor: { select: { nome: true } },
} satisfies Prisma.MovimentacaoInclude;

/** Mais recentes primeiro; o id desempata as registradas no mesmo milissegundo. */
export const maisRecentesPrimeiro: Prisma.MovimentacaoOrderByWithRelationInput[] = [
  { dataHora: "desc" },
  { id: "desc" },
];

/** Quantas movimentações a listagem sem paginação devolve. */
const LIMITE_SEM_PAGINA = 100;

export const movimentacaoRepository = {
  listar(filtro: Prisma.MovimentacaoWhereInput = {}) {
    return prisma.movimentacao.findMany({
      where: filtro,
      include: detalhesDaMovimentacao,
      orderBy: maisRecentesPrimeiro,
      take: LIMITE_SEM_PAGINA,
    });
  },

  /** Uma página e o total de registros do filtro, lidos na mesma transação. */
  async listarPagina(filtro: Prisma.MovimentacaoWhereInput, pagina: number, tamanho: number) {
    const [dados, total] = await prisma.$transaction([
      prisma.movimentacao.findMany({
        where: filtro,
        include: detalhesDaMovimentacao,
        orderBy: maisRecentesPrimeiro,
        skip: (pagina - 1) * tamanho,
        take: tamanho,
      }),
      prisma.movimentacao.count({ where: filtro }),
    ]);
    return { dados, total };
  },
};
