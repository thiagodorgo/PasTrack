// Confere se as migrations versionadas reproduzem exatamente o schema.prisma.
// Diferenças intencionais, de recursos do Postgres que o Prisma não representa no schema,
// ficam em PERMITIDAS com o motivo. Qualquer outra diferença faz o comando falhar.
//
// Uso: SHADOW_DATABASE_URL=postgresql://... npm run db:verificar
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";

const PERMITIDAS = [
  // índice único parcial: no máximo um alerta ABERTO por pastilha (migration seguranca_integridade)
  /^DROP INDEX "alerta_aberto_por_pastilha";$/,
];

const sombra = process.env.SHADOW_DATABASE_URL;
if (!sombra) {
  console.error("Defina SHADOW_DATABASE_URL com um banco vazio que possa ser recriado (banco de sombra).");
  process.exit(2);
}

const require = createRequire(import.meta.url);
const cliPrisma = require.resolve("prisma/build/index.js");

const saida = execFileSync(
  process.execPath,
  [
    cliPrisma,
    "migrate",
    "diff",
    "--from-migrations",
    "prisma/migrations",
    "--to-schema-datamodel",
    "prisma/schema.prisma",
    "--shadow-database-url",
    sombra,
    "--script",
  ],
  { encoding: "utf8", env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL ?? sombra } }
);

const diferencas = saida
  .split(/\r?\n/)
  .map((linha) => linha.trim())
  .filter((linha) => linha && !linha.startsWith("--"))
  .filter((linha) => !PERMITIDAS.some((permitida) => permitida.test(linha)));

if (diferencas.length > 0) {
  console.error("As migrations não reproduzem o schema.prisma. Diferenças encontradas:");
  for (const linha of diferencas) console.error(`  ${linha}`);
  process.exit(1);
}

console.log("Migrations em sincronia com o schema.prisma.");
