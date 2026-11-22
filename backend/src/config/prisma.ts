import { PrismaClient } from "@prisma/client";
import { env } from "./env";

/**
 * Cliente Prisma único da API, ligado ao DATABASE_URL. Serviços e repositórios importam esta instância
 * para dividir o mesmo pool de conexões.
 */
export const prisma = new PrismaClient({
  datasources: { db: { url: env.DATABASE_URL } },
  // nos testes os erros esperados já são verificados pelas asserções; não poluir a saída
  log: env.NODE_ENV === "development" ? ["warn", "error"] : env.NODE_ENV === "test" ? [] : ["error"],
});
