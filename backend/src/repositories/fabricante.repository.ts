import { prisma } from "../config/prisma";

export const fabricanteRepository = {
  listar() {
    return prisma.fabricante.findMany({ orderBy: { nome: "asc" } });
  },

  criar(nome: string) {
    return prisma.fabricante.create({ data: { nome } });
  },
};
