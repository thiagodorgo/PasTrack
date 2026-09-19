import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";

export interface FiltroPastilhas {
  busca?: string;
  criticas?: boolean;
}

/** Campos que o cadastro grava. O saldo fica de fora: ele só muda por movimentação. */
type CamposEditaveis = "descricao" | "modelo" | "aplicacao" | "unidade" | "estoqueMinimo" | "fabricanteId";
export type NovaPastilha = Pick<Prisma.PastilhaUncheckedCreateInput, "codigo" | CamposEditaveis>;
export type AlteracaoPastilha = Pick<Prisma.PastilhaUncheckedUpdateInput, CamposEditaveis>;

/** Mínimo definido (maior que zero) e saldo no mínimo ou abaixo dele. O filtro criticas=true e o painel usam a mesma regra. */
export const PASTILHAS_CRITICAS: Prisma.PastilhaWhereInput = {
  estoqueMinimo: { gt: 0 },
  saldoAtual: { lte: prisma.pastilha.fields.estoqueMinimo },
};

export const pastilhaRepository = {
  listar(filtro: FiltroPastilhas = {}) {
    const condicoes: Prisma.PastilhaWhereInput[] = [];
    if (filtro.busca) {
      condicoes.push({
        OR: [
          { codigo: { contains: filtro.busca, mode: "insensitive" } },
          { descricao: { contains: filtro.busca, mode: "insensitive" } },
        ],
      });
    }
    if (filtro.criticas) condicoes.push(PASTILHAS_CRITICAS);
    return prisma.pastilha.findMany({
      where: { AND: condicoes },
      include: { fabricante: true },
      orderBy: { descricao: "asc" },
    });
  },

  buscarPorId(id: number) {
    return prisma.pastilha.findUnique({ where: { id }, include: { fabricante: true } });
  },

  /** Trava a linha até o fim da transação e devolve a pastilha como está gravada, ou null. */
  async buscarParaAtualizar(tx: Prisma.TransactionClient, id: number) {
    await tx.$queryRaw`SELECT "id" FROM "pastilha" WHERE "id" = ${id} FOR UPDATE`;
    return tx.pastilha.findUnique({ where: { id } });
  },

  criar(tx: Prisma.TransactionClient, dados: NovaPastilha) {
    return tx.pastilha.create({ data: dados, include: { fabricante: true } });
  },

  atualizar(tx: Prisma.TransactionClient, id: number, dados: AlteracaoPastilha) {
    return tx.pastilha.update({ where: { id }, data: dados, include: { fabricante: true } });
  },
};
