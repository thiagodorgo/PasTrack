import { prisma } from "../config/prisma";
import { alertaRepository } from "../repositories/alerta.repository";
import { movimentacaoRepository } from "../repositories/movimentacao.repository";
import { pastilhaRepository } from "../repositories/pastilha.repository";

export const painelService = {
  async resumo() {
    const [totalPastilhas, alertasAbertos, criticas, movimentacoes] = await Promise.all([
      prisma.pastilha.count(),
      alertaRepository.contarAbertos(),
      pastilhaRepository.listarCriticas(),
      movimentacaoRepository.listar(),
    ]);

    return {
      totalPastilhas,
      alertasAbertos,
      itensCriticos: criticas.map((p) => ({
        id: p.id,
        codigo: p.codigo,
        descricao: p.descricao,
        saldoAtual: p.saldoAtual,
        estoqueMinimo: p.estoqueMinimo,
      })),
      ultimasMovimentacoes: movimentacoes.slice(0, 5),
    };
  },
};
