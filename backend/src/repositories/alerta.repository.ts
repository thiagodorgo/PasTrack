import { Prisma, StatusAlerta } from "@prisma/client";
import { prisma } from "../config/prisma";

/** Pastilha e responsável pela resolução, devolvidos com cada alerta da listagem. */
const detalhesDoAlerta = {
  pastilha: { select: { codigo: true, descricao: true, saldoAtual: true, estoqueMinimo: true } },
  resolvidoPor: { select: { id: true, nome: true } },
} satisfies Prisma.AlertaInclude;

export const alertaRepository = {
  /** Alertas da situação informada, ou de todas, dos mais recentes para os mais antigos. */
  listar(situacao?: StatusAlerta) {
    return prisma.alerta.findMany({
      where: situacao ? { situacao } : undefined,
      include: detalhesDoAlerta,
      orderBy: [{ dataGeracao: "desc" }, { id: "desc" }],
    });
  },
};
