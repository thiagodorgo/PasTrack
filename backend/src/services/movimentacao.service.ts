import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import { AppError } from "../middlewares/erros";
import { movimentacaoRepository } from "../repositories/movimentacao.repository";
import { ConsultaMovimentacoes, RegistrarMovimentacao } from "../schemas/movimentacao.schema";
import { avaliarAlerta } from "./estoque/avaliar-alerta";

type RegistrarMovimentacaoDTO = RegistrarMovimentacao & { usuarioId: number };

/** Maior saldo que cabe na coluna INT4 do banco. */
const SALDO_MAXIMO = 2_147_483_647;

/**
 * ENTRADA: o fornecedor precisa existir. O incremento só acontece se o saldo continuar cabendo
 * no INT4 do banco, numa única instrução que também trava a linha da pastilha.
 */
async function aplicarEntrada(
  tx: Prisma.TransactionClient,
  pastilhaId: number,
  dados: { fornecedorId: number; quantidade: number }
) {
  const fornecedor = await tx.fornecedor.findUnique({
    where: { id: dados.fornecedorId },
    select: { id: true },
  });
  if (!fornecedor) {
    throw new AppError("Fornecedor não encontrado", 400, "REFERENCIA_INVALIDA");
  }
  const { count } = await tx.pastilha.updateMany({
    where: { id: pastilhaId, saldoAtual: { lte: SALDO_MAXIMO - dados.quantidade } },
    data: { saldoAtual: { increment: dados.quantidade } },
  });
  if (count === 0) {
    const atual = await tx.pastilha.findUniqueOrThrow({
      where: { id: pastilhaId },
      select: { saldoAtual: true, unidade: true },
    });
    throw new AppError(
      `Entrada acima do saldo máximo de ${SALDO_MAXIMO} ${atual.unidade}: há ${atual.saldoAtual} ${atual.unidade} em estoque`
    );
  }
}

/**
 * SAÍDA: o decremento só acontece se ainda houver saldo, numa única instrução.
 * Não há janela entre ler e gravar, então SAÍDAs simultâneas nunca deixam o saldo negativo.
 */
async function aplicarSaida(tx: Prisma.TransactionClient, pastilhaId: number, quantidade: number) {
  const { count } = await tx.pastilha.updateMany({
    where: { id: pastilhaId, saldoAtual: { gte: quantidade } },
    data: { saldoAtual: { decrement: quantidade } },
  });
  if (count === 0) {
    const atual = await tx.pastilha.findUniqueOrThrow({
      where: { id: pastilhaId },
      select: { saldoAtual: true, unidade: true },
    });
    throw new AppError(`Saldo insuficiente: há ${atual.saldoAtual} ${atual.unidade} em estoque`);
  }
}

export const movimentacaoService = {
  /** Sem página: as 100 mais recentes. Com página: { dados, total, pagina, tamanho }. */
  async listar(consulta: ConsultaMovimentacoes) {
    const filtro: Prisma.MovimentacaoWhereInput = {
      pastilhaId: consulta.pastilhaId,
      tipo: consulta.tipo,
      dataHora: consulta.de || consulta.ate ? { gte: consulta.de, lte: consulta.ate } : undefined,
    };
    if (consulta.pagina === undefined) {
      return movimentacaoRepository.listar(filtro);
    }
    const { dados, total } = await movimentacaoRepository.listarPagina(
      filtro,
      consulta.pagina,
      consulta.tamanho
    );
    return { dados, total, pagina: consulta.pagina, tamanho: consulta.tamanho };
  },

  /**
   * Registra a movimentação, atualiza o saldo e avalia o alerta na mesma transação.
   * A atualização do saldo vem primeiro: ela trava a linha da pastilha e serializa as
   * movimentações concorrentes até o fim da transação.
   */
  registrar(dados: RegistrarMovimentacaoDTO) {
    return prisma.$transaction(async (tx) => {
      const pastilha = await tx.pastilha.findUnique({
        where: { id: dados.pastilhaId },
        select: { id: true },
      });
      if (!pastilha) {
        throw new AppError("Pastilha não encontrada", 404, "NAO_ENCONTRADO");
      }

      if (dados.tipo === "ENTRADA") {
        await aplicarEntrada(tx, pastilha.id, dados);
      } else {
        await aplicarSaida(tx, pastilha.id, dados.quantidade);
      }

      const movimentacao = await tx.movimentacao.create({
        data: {
          tipo: dados.tipo,
          quantidade: dados.quantidade,
          pastilhaId: pastilha.id,
          usuarioId: dados.usuarioId,
          fornecedorId: dados.tipo === "ENTRADA" ? dados.fornecedorId : null,
          documento: dados.documento,
          observacao: dados.observacao,
        },
      });

      await avaliarAlerta(tx, pastilha.id, dados.usuarioId);

      // a linha continua travada por esta transação: o saldo lido é o que acabou de ser gravado
      const { saldoAtual } = await tx.pastilha.findUniqueOrThrow({
        where: { id: pastilha.id },
        select: { saldoAtual: true },
      });
      return { movimentacao, saldoAtual };
    });
  },
};
