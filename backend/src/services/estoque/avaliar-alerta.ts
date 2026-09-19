import { Prisma } from "@prisma/client";
import { registrarAuditoria } from "../auditoria.service";

export type ResultadoAvaliacao = "aberto" | "resolvido" | "inalterado";

/**
 * Mantém o alerta da pastilha coerente com o saldo e o estoque mínimo atuais.
 *
 * Rode dentro da transação e DEPOIS de atualizar a pastilha: a atualização trava a linha e
 * serializa transações concorrentes da mesma pastilha. O índice único parcial do banco
 * (um alerta ABERTO por pastilha) é a segunda barreira contra duplicidade.
 *
 * - mínimo maior que zero, saldo no mínimo ou abaixo e nenhum alerta aberto: abre um alerta;
 * - saldo acima do mínimo, ou mínimo zerado, com alerta aberto: fecha automaticamente, sem responsável.
 */
export async function avaliarAlerta(
  tx: Prisma.TransactionClient,
  pastilhaId: number,
  usuarioId?: number | null
): Promise<ResultadoAvaliacao> {
  const pastilha = await tx.pastilha.findUniqueOrThrow({
    where: { id: pastilhaId },
    select: { saldoAtual: true, estoqueMinimo: true },
  });
  const aberto = await tx.alerta.findFirst({
    where: { pastilhaId, situacao: "ABERTO" },
    select: { id: true },
  });
  // Estoque mínimo 0 significa que a pastilha não tem reposição controlada: nunca gera alerta.
  const noMinimoOuAbaixo = pastilha.estoqueMinimo > 0 && pastilha.saldoAtual <= pastilha.estoqueMinimo;

  if (noMinimoOuAbaixo && !aberto) {
    const { count } = await tx.alerta.createMany({ data: [{ pastilhaId }], skipDuplicates: true });
    if (count === 0) return "inalterado";
    await registrarAuditoria(tx, {
      usuarioId,
      acao: "alerta.aberto",
      entidade: "pastilha",
      entidadeId: pastilhaId,
      depois: pastilha,
    });
    return "aberto";
  }

  if (!noMinimoOuAbaixo && aberto) {
    await tx.alerta.update({
      where: { id: aberto.id },
      data: { situacao: "RESOLVIDO", dataResolucao: new Date(), resolvidoPorId: null },
    });
    await registrarAuditoria(tx, {
      usuarioId,
      acao: "alerta.resolvido_automaticamente",
      entidade: "alerta",
      entidadeId: aberto.id,
      depois: pastilha,
    });
    return "resolvido";
  }

  return "inalterado";
}
