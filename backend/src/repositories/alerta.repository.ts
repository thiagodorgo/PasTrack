import { prisma } from "../config/prisma";

export const alertaRepository = {
  listarAbertos() {
    return prisma.alerta.findMany({
      where: { situacao: "ABERTO" },
      include: { pastilha: { select: { codigo: true, descricao: true, saldoAtual: true, estoqueMinimo: true } } },
      orderBy: { dataGeracao: "desc" },
    });
  },

  contarAbertos() {
    return prisma.alerta.count({ where: { situacao: "ABERTO" } });
  },

  resolver(id: number) {
    return prisma.alerta.update({ where: { id }, data: { situacao: "RESOLVIDO" } });
  },
};
