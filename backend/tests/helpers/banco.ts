import { prisma } from "../../src/config/prisma";

/** Esvazia todas as tabelas e reinicia os ids, para cada teste começar do zero. */
export async function limparBanco() {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "movimentacao", "alerta", "pastilha", "fornecedor", "fabricante", "usuario" RESTART IDENTITY CASCADE'
  );
}
