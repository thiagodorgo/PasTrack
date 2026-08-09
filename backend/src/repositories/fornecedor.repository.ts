import { prisma } from "../config/prisma";

export const fornecedorRepository = {
  listar() {
    return prisma.fornecedor.findMany({ orderBy: { nome: "asc" } });
  },

  criar(dados: { nome: string; cnpj?: string; contato?: string }) {
    return prisma.fornecedor.create({ data: dados });
  },
};
