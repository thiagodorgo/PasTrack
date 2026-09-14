import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// resultados consumidos pelo relatório de testes do repositório, ancorados neste pacote
const resultados = (caminho: string) =>
  fileURLToPath(new URL(`../tests/results/latest/${caminho}`, import.meta.url));

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["tests/setup.ts"],
    include: ["tests/**/*.spec.{ts,tsx}"],
    restoreMocks: true,
    reporters: ["default", ["junit", { outputFile: resultados("frontend-junit.xml") }]],
    coverage: {
      provider: "v8",
      // grava a cobertura mesmo quando algum teste falha, para o snapshot de evidência ficar completo
      reportOnFailure: true,
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/main.tsx", "src/vite-env.d.ts", "src/types.ts"],
      reporter: ["text-summary", "json-summary", "html"],
      reportsDirectory: resultados("frontend-coverage"),
    },
  },
});
