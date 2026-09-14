import { PrismaClient } from "@prisma/client";
import { execSync } from "node:child_process";
import type { TestProject } from "vitest/node";

/** Confere o banco de teste e aplica as migrations antes dos testes de integração. */
export default async function prepararBancoDeTeste(projeto: TestProject) {
  const ambiente = projeto.config.env as Record<string, string>;
  const prisma = new PrismaClient({ datasources: { db: { url: ambiente.DATABASE_URL } } });
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    throw new Error("Banco de teste indisponível na porta 5433. Suba com: npm run db:teste:subir");
  } finally {
    await prisma.$disconnect();
  }
  execSync("npx prisma migrate deploy", { stdio: "pipe", env: { ...process.env, ...ambiente } });
}
