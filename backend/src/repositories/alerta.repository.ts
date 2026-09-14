import { Prisma, StatusAlerta } from "@prisma/client";
import { prisma } from "../config/prisma";

/** Pastilha e responsável pela resolução, devolvidos com cada alerta da listagem. */
const detalhesDoAlerta = {
  pastilha: { select: { codigo: true, descricao: true, saldoAtual: true, estoqueMinimo: true } },
  resolvidoPor: { select: { id: true, nome: true } },
} satisfies Prisma.AlertaInclude;

/** Mais recentes primeiro; o id desempata os gerados no mesmo milissegundo. */
const maisRecentesPrimeiro: Prisma.AlertaOrderByWithRelationInput[] = [
  { dataGeracao: "desc" },
  { id: "desc" },
];

/** Quantos alertas a listagem sem paginação devolve. */
const LIMITE_SEM_PAGINA = 100;

function filtroDaSituacao(situacao?: StatusAlerta): Prisma.AlertaWhereInput {
  return situacao ? { situacao } : {};
}

export const alertaRepository = {
  /** Os 100 alertas mais recentes da situação informada, ou de todas. */
  listar(situacao?: StatusAlerta) {
    return prisma.alerta.findMany({
      where: filtroDaSituacao(situacao),
      include: detalhesDoAlerta,
      orderBy: maisRecentesPrimeiro,
      take: LIMITE_SEM_PAGINA,
    });
  },

  /** Uma página e o total de alertas da situação, lidos na mesma transação. */
  async listarPagina(situacao: StatusAlerta | undefined, pagina: number, tamanho: number) {
    const where = filtroDaSituacao(situacao);
    const [dados, total] = await prisma.$transaction([
      prisma.alerta.findMany({
        where,
        include: detalhesDoAlerta,
        orderBy: maisRecentesPrimeiro,
        skip: (pagina - 1) * tamanho,
        take: tamanho,
      }),
      prisma.alerta.count({ where }),
    ]);
    return { dados, total };
  },
};
