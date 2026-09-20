import { defineConfig, devices } from "@playwright/test";

/**
 * Endereço do sistema no ar. O padrão é a porta do ambiente de testes ponta a ponta.
 * Usa 127.0.0.1, e não localhost: no Windows o localhost tenta o IPv6 primeiro, e o ambiente
 * publica a porta só no IPv4.
 */
export const BASE_URL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:8093";

const noCI = !!process.env.CI;

export default defineConfig({
  testDir: "./testes",
  // os casos mexem no mesmo estoque: rodar em paralelo deixaria os saldos imprevisíveis
  workers: 1,
  fullyParallel: false,
  forbidOnly: noCI,
  retries: noCI ? 1 : 0,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  globalSetup: "./preparo/global.ts",
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
    ["junit", { outputFile: "../tests/results/latest/e2e-junit.xml" }],
  ],
  use: {
    baseURL: BASE_URL,
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
