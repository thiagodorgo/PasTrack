import { describe, expect, it } from "vitest";
import { carregarEnv, ErroDeConfiguracao } from "../../src/config/env";

const valida = {
  NODE_ENV: "development",
  DATABASE_URL: "postgresql://usuario:senha@localhost:5432/banco",
  JWT_SECRET: "k".repeat(40),
};

describe("carregarEnv", () => {
  it("aceita a configuração mínima e aplica os padrões", () => {
    const env = carregarEnv(valida);
    expect(env.PORT).toBe(3333);
    expect(env.BCRYPT_CUSTO).toBe(12);
    expect(env.JWT_EXPIRES_IN).toBe("8h");
    expect(env.TRUST_PROXY).toBe(0);
    expect(env.CORS_ORIGINS).toEqual(["http://localhost:5173"]);
  });

  it("separa a lista de origens do CORS e ignora espaços", () => {
    const env = carregarEnv({ ...valida, CORS_ORIGINS: " http://a.local , http://b.local ,," });
    expect(env.CORS_ORIGINS).toEqual(["http://a.local", "http://b.local"]);
  });

  it.each([
    ["JWT_SECRET ausente", { JWT_SECRET: undefined }, "JWT_SECRET"],
    ["JWT_SECRET curto", { JWT_SECRET: "curto" }, "JWT_SECRET"],
    ["JWT_SECRET do exemplo", { JWT_SECRET: "troque-esta-chave-troque-esta-chave-123" }, "JWT_SECRET"],
    ["DATABASE_URL ausente", { DATABASE_URL: undefined }, "DATABASE_URL"],
    ["DATABASE_URL de outro banco", { DATABASE_URL: "mysql://localhost/banco" }, "DATABASE_URL"],
    ["PORT não numérica", { PORT: "abc" }, "PORT"],
    ["PORT fora da faixa", { PORT: "70000" }, "PORT"],
    ["JWT_EXPIRES_IN sem unidade", { JWT_EXPIRES_IN: "oito horas" }, "JWT_EXPIRES_IN"],
    ["NODE_ENV desconhecido", { NODE_ENV: "homologacao" }, "NODE_ENV"],
    ["custo do bcrypt baixo em produção", { NODE_ENV: "production", BCRYPT_CUSTO: "10" }, "BCRYPT_CUSTO"],
  ])("recusa %s e cita a variável", (_caso, alteracao, variavel) => {
    const carregar = () => carregarEnv({ ...valida, ...alteracao });
    expect(carregar).toThrow(ErroDeConfiguracao);
    expect(carregar).toThrow(variavel);
  });

  it("aceita custo 12 em produção", () => {
    expect(carregarEnv({ ...valida, NODE_ENV: "production", BCRYPT_CUSTO: "12" }).BCRYPT_CUSTO).toBe(12);
  });
});
