import { TipoMovimentacao } from "@prisma/client";
import { prisma } from "../config/prisma";
import { AppError } from "../middlewares/erros";
import { movimentacaoRepository } from "../repositories/movimentacao.repository";

interface RegistrarMovimentacaoDTO {
  tipo: TipoMovimentacao;
  pastilhaId: number;
  quantidade: number;
  usuarioId: number;
  fornecedorId?: number;
  documento?: string;
  observacao?: string;
}

export const movimentacaoService = {
  listar(pastilhaId?: number) {
    return movimentacaoRepository.listar(pastilhaId);
  },

  // registra a movimentação, atualiza o saldo e gera alerta, tudo na mesma transação
  registrar(dados: RegistrarMovimentacaoDTO) {
    if (dados.quantidade <= 0) {
      throw new AppError("A quantidade deve ser maior que zero");
    }

    return prisma.$transaction(async (tx) => {
      const pastilha = await tx.pastilha.findUnique({ where: { id: dados.pastilhaId } });
      if (!pastilha) {
        throw new AppError("Pastilha não encontrada", 404);
      }

      if (dados.tipo === "SAIDA" && pastilha.saldoAtual < dados.quantidade) {
        throw new AppError(
          `Saldo insuficiente: há ${pastilha.saldoAtual} ${pastilha.unidade} em estoque`
        );
      }

      const movimentacao = await tx.movimentacao.create({
        data: {
          tipo: dados.tipo,
          quantidade: dados.quantidade,
          pastilhaId: dados.pastilhaId,
          usuarioId: dados.usuarioId,
          fornecedorId: dados.tipo === "ENTRADA" ? dados.fornecedorId : undefined,
          documento: dados.documento,
          observacao: dados.observacao,
        },
      });

      const delta = dados.tipo === "ENTRADA" ? dados.quantidade : -dados.quantidade;
      const atualizada = await tx.pastilha.update({
        where: { id: dados.pastilhaId },
        data: { saldoAtual: { increment: delta } },
      });

      if (atualizada.saldoAtual <= atualizada.estoqueMinimo) {
        const alertaAberto = await tx.alerta.findFirst({
          where: { pastilhaId: dados.pastilhaId, situacao: "ABERTO" },
        });
        if (!alertaAberto) {
          await tx.alerta.create({ data: { pastilhaId: dados.pastilhaId } });
        }
      }

      return { movimentacao, saldoAtual: atualizada.saldoAtual };
    });
  },
};
