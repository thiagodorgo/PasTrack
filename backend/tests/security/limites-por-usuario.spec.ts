import type { Express } from "express";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { autorizacao } from "../helpers/api";
import { criarUsuario } from "../helpers/fabricas";

/**
 * Um app próprio, configurado como em produção atrás do nginx: TRUST_PROXY=1 e o X-Forwarded-For montado
 * com $proxy_add_x_forwarded_for. Os limites ficam pequenos para caber no teste.
 */
const LIMITE_POR_IP = 8;
const LIMITE_POR_USUARIO = 3;

let app: Express;
let desconectar: () => Promise<void>;

beforeAll(async () => {
  vi.stubEnv("TRUST_PROXY", "1");
  vi.stubEnv("RATE_LIMIT_GLOBAL_MAX", String(LIMITE_POR_IP));
  vi.stubEnv("RATE_LIMIT_USUARIO_MAX", String(LIMITE_POR_USUARIO));
  vi.resetModules();
  app = (await import("../../src/app")).app;
  const { prisma } = await import("../../src/config/prisma");
  desconectar = () => prisma.$disconnect();
});

afterAll(async () => {
  vi.unstubAllEnvs();
  await desconectar();
});

/** Cabeçalho que o nginx monta: o que o cliente mandou, se mandou, seguido do IP de quem conectou. */
function viaNginx(ipDoPosto: string, enviadoPeloCliente?: string) {
  return { "X-Forwarded-For": enviadoPeloCliente ? `${enviadoPeloCliente}, ${ipDoPosto}` : ipDoPosto };
}

describe("limites atrás do nginx, com TRUST_PROXY=1", () => {
  it("cada posto tem o próprio contador por IP, que só barra varredura", async () => {
    for (let requisicao = 1; requisicao <= LIMITE_POR_IP; requisicao++) {
      const resposta = await request(app).get("/api/pastilhas").set(viaNginx("203.0.113.10"));
      expect(resposta.status).toBe(401);
    }

    const bloqueada = await request(app).get("/api/pastilhas").set(viaNginx("203.0.113.10"));
    expect(bloqueada.status).toBe(429);
    expect(bloqueada.body.codigo).toBe("MUITAS_TENTATIVAS");
    expect(Number(bloqueada.headers["retry-after"])).toBeGreaterThan(0);

    const outroPosto = await request(app).get("/api/pastilhas").set(viaNginx("203.0.113.11"));
    expect(outroPosto.status).toBe(401);
  });

  it("o X-Forwarded-For forjado pelo cliente não abre um contador novo", async () => {
    for (let requisicao = 1; requisicao <= LIMITE_POR_IP; requisicao++) {
      const forjado = viaNginx("203.0.113.20", "10.0.0." + requisicao);
      expect((await request(app).get("/api/health").set(forjado)).status).toBe(200);
    }
    const bloqueada = await request(app).get("/api/health").set(viaNginx("203.0.113.20", "10.9.9.9"));
    expect(bloqueada.status).toBe(429);
  });

  it("usuários do mesmo posto têm orçamentos separados, e o de cada um vale em qualquer IP", async () => {
    const ana = await criarUsuario();
    const bruno = await criarUsuario();
    const posto = viaNginx("203.0.113.30");

    for (let requisicao = 1; requisicao <= LIMITE_POR_USUARIO; requisicao++) {
      const resposta = await request(app).get("/api/pastilhas").set(posto).set(autorizacao(ana.token));
      expect(resposta.status).toBe(200);
    }
    const bloqueada = await request(app).get("/api/pastilhas").set(posto).set(autorizacao(ana.token));
    expect(bloqueada.status).toBe(429);
    expect(bloqueada.body.codigo).toBe("MUITAS_TENTATIVAS");
    expect(bloqueada.headers["ratelimit-policy"]).toContain("q=" + LIMITE_POR_USUARIO);

    // o colega do mesmo posto continua trabalhando
    const colega = await request(app).get("/api/pastilhas").set(posto).set(autorizacao(bruno.token));
    expect(colega.status).toBe(200);

    // e mudar de IP não renova o orçamento de quem estourou
    const outroIp = await request(app)
      .get("/api/auth/me")
      .set(viaNginx("203.0.113.31"))
      .set(autorizacao(ana.token));
    expect(outroIp.status).toBe(429);
  });
});
