import { defineConfig } from "vitest/config";

/**
 * No Windows, "localhost" resolve primeiro para ::1, e o banco de teste só é publicado em 127.0.0.1. Nessa
 * situação o Prisma leva cerca de 2 s para abrir cada conexão nova, e duas transações interativas
 * simultâneas estouram o maxWait de 2 s (erro P2028). Com o endereço IPv4 direto, a conexão abre na hora.
 */
function urlDoBancoDeTeste(url: string) {
  return url.replace("@localhost:", "@127.0.0.1:");
}

/** Variáveis de ambiente dos testes. Nenhum valor aqui é segredo de produção. */
const ambienteDeTeste = {
  NODE_ENV: "test",
  DATABASE_URL: urlDoBancoDeTeste(
    process.env.DATABASE_URL_TESTE ??
      "postgresql://pastrack:pastrack@127.0.0.1:5433/pastrack_teste?schema=public"
  ),
  JWT_SECRET: "chave-local-dos-testes-automatizados-0123456789",
  JWT_EXPIRES_IN: "1h",
  CORS_ORIGINS: "http://localhost:5173",
  TRUST_PROXY: "0",
  BCRYPT_CUSTO: "4",
  LOG_LEVEL: "silent",
  // os limites por IP e por usuário não podem interferir nos testes; o de login fica no padrão (5)
  RATE_LIMIT_GLOBAL_MAX: "100000",
  RATE_LIMIT_USUARIO_MAX: "100000",
};

export default defineConfig({
  test: {
    env: ambienteDeTeste,
    restoreMocks: true,
    reporters: ["default", ["junit", { outputFile: "../tests/results/latest/backend-junit.xml" }]],
    coverage: {
      provider: "v8",
      // grava a cobertura mesmo quando algum teste falha, para o snapshot de evidência ficar completo
      reportOnFailure: true,
      reporter: ["text-summary", "json-summary", "html"],
      reportsDirectory: "../tests/results/latest/backend-coverage",
      include: ["src/**/*.ts"],
      exclude: ["src/server.ts", "src/types/**", "src/scripts/seed.ts", "src/scripts/seed-demo.ts"],
    },
    projects: [
      {
        extends: true,
        test: { name: "unit", include: ["tests/unit/**/*.spec.ts"] },
      },
      {
        extends: true,
        test: {
          name: "integracao",
          include: ["tests/integration/**/*.spec.ts", "tests/security/**/*.spec.ts"],
          globalSetup: ["tests/setup/global.ts"],
          setupFiles: ["tests/setup/integracao.ts"],
          fileParallelism: false,
        },
      },
    ],
  },
});
