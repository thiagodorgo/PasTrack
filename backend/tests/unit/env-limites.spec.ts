import { describe, expect, it } from "vitest";
import { carregarEnv, ErroDeConfiguracao } from "../../src/config/env";

const valida = {
  NODE_ENV: "development",
  DATABASE_URL: "postgresql://usuario:senha@localhost:5432/banco",
  JWT_SECRET: "k".repeat(40),
};

describe("limites de requisições no ambiente", () => {
  it("aplica os padrões de 5 falhas em 15 minutos e 300 requisições por minuto", () => {
    const env = carregarEnv(valida);
    expect(env.RATE_LIMIT_LOGIN_MAX).toBe(5);
    expect(env.RATE_LIMIT_LOGIN_JANELA_MIN).toBe(15);
    expect(env.RATE_LIMIT_GLOBAL_MAX).toBe(300);
  });

  it("aceita valores informados", () => {
    const env = carregarEnv({
      ...valida,
      RATE_LIMIT_LOGIN_MAX: "3",
      RATE_LIMIT_LOGIN_JANELA_MIN: "30",
      RATE_LIMIT_GLOBAL_MAX: "1000",
    });
    expect(env.RATE_LIMIT_LOGIN_MAX).toBe(3);
    expect(env.RATE_LIMIT_LOGIN_JANELA_MIN).toBe(30);
    expect(env.RATE_LIMIT_GLOBAL_MAX).toBe(1000);
  });

  it.each([
    ["RATE_LIMIT_LOGIN_MAX", "0"],
    ["RATE_LIMIT_LOGIN_MAX", "abc"],
    ["RATE_LIMIT_LOGIN_JANELA_MIN", "0"],
    ["RATE_LIMIT_LOGIN_JANELA_MIN", "2.5"],
    ["RATE_LIMIT_GLOBAL_MAX", "-1"],
  ])("recusa %s=%s e cita a variável", (variavel, valor) => {
    const carregar = () => carregarEnv({ ...valida, [variavel]: valor });
    expect(carregar).toThrow(ErroDeConfiguracao);
    expect(carregar).toThrow(variavel);
  });
});
