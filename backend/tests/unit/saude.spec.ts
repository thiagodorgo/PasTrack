import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { saudeRotas } from "../../src/routes/saude.routes";

vi.mock("../../src/config/prisma", () => ({
  prisma: {
    $queryRaw: vi.fn(async () => {
      throw new Error("conexão recusada");
    }),
  },
}));

describe("GET /health sem banco", () => {
  it("responde 503 com a chave erro e mantém os campos de diagnóstico", async () => {
    const resposta = await request(express().use(saudeRotas)).get("/health");
    expect(resposta.status).toBe(503);
    expect(resposta.body).toMatchObject({
      erro: "Banco de dados indisponível",
      status: "erro",
      banco: "indisponivel",
    });
    expect(typeof resposta.body.versao).toBe("string");
    expect(typeof resposta.body.uptimeSegundos).toBe("number");
  });
});
