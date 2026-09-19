import { prisma } from "../config/prisma";
import { detalhesDaMovimentacao, maisRecentesPrimeiro } from "./movimentacao.repository";
import { PASTILHAS_CRITICAS } from "./pastilha.repository";

/** Quantos itens críticos o painel mostra. */
export const LIMITE_ITENS_CRITICOS = 20;
/** Quantas movimentações recentes o painel mostra. */
export const LIMITE_ULTIMAS_MOVIMENTACOES = 5;

/** Consultas do painel. Cada limite é aplicado no banco, não depois de carregar tudo. */
export const painelRepository = {
  contarPastilhas() {
    return prisma.pastilha.count();
  },

  contarAlertasAbertos() {
    return prisma.alerta.count({ where: { situacao: "ABERTO" } });
  },

  /** Pastilhas com mínimo definido e saldo no mínimo ou abaixo dele, das de menor saldo para as de maior. */
  listarItensCriticos() {
    return prisma.pastilha.findMany({
      where: PASTILHAS_CRITICAS,
      select: { id: true, codigo: true, descricao: true, saldoAtual: true, estoqueMinimo: true },
      orderBy: [{ saldoAtual: "asc" }, { id: "asc" }],
      take: LIMITE_ITENS_CRITICOS,
    });
  },

  /** Mesmo formato da listagem de movimentações. */
  listarUltimasMovimentacoes() {
    return prisma.movimentacao.findMany({
      include: detalhesDaMovimentacao,
      orderBy: maisRecentesPrimeiro,
      take: LIMITE_ULTIMAS_MOVIMENTACOES,
    });
  },
};
