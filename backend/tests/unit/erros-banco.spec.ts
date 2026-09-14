import { Prisma } from "@prisma/client";
import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { AppError, tratarErros } from "../../src/middlewares/erros";

function erroDoPrisma(code: string, meta?: Record<string, unknown>) {
  return new Prisma.PrismaClientKnownRequestError("falha simulada", { code, clientVersion: "teste", meta });
}

function appQueLanca(lancar: () => never) {
  const app = express();
  app.get("/", () => lancar());
  app.use(tratarErros);
  return app;
}

describe("tratarErros() com erros do banco", () => {
  it.each([
    ["Fabricante", "Já existe um fabricante com este nome"],
    ["Pastilha", "Já existe uma pastilha com este código"],
    ["Fornecedor", "Já existe um fornecedor com este CNPJ"],
    ["Usuario", "Já existe um usuário com este e-mail"],
  ])("duplicidade em %s vira 409 com mensagem clara", async (modelo, mensagem) => {
    const app = appQueLanca(() => {
      throw erroDoPrisma("P2002", { modelName: modelo });
    });
    const resposta = await request(app).get("/");
    expect(resposta.status).toBe(409);
    expect(resposta.body).toEqual({ erro: mensagem, codigo: "DUPLICADO" });
  });

  it("duplicidade sem modelo conhecido usa mensagem genérica", async () => {
    const resposta = await request(
      appQueLanca(() => {
        throw erroDoPrisma("P2002");
      })
    ).get("/");
    expect(resposta.body).toEqual({ erro: "Registro duplicado", codigo: "DUPLICADO" });
  });

  it("registro inexistente vira 404", async () => {
    const resposta = await request(
      appQueLanca(() => {
        throw erroDoPrisma("P2025");
      })
    ).get("/");
    expect(resposta.status).toBe(404);
    expect(resposta.body).toEqual({ erro: "Registro não encontrado", codigo: "NAO_ENCONTRADO" });
  });

  it("referência inválida vira 400", async () => {
    const resposta = await request(
      appQueLanca(() => {
        throw erroDoPrisma("P2003");
      })
    ).get("/");
    expect(resposta.status).toBe(400);
    expect(resposta.body.codigo).toBe("REFERENCIA_INVALIDA");
  });

  it("outros códigos do banco viram 500 sem detalhes", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const resposta = await request(
      appQueLanca(() => {
        throw erroDoPrisma("P2034");
      })
    ).get("/");
    expect(resposta.status).toBe(500);
    expect(resposta.body).toEqual({ erro: "Erro interno no servidor" });
  });
});

describe("tratarErros() com códigos estáveis", () => {
  it("AppError com código devolve o código", async () => {
    const resposta = await request(
      appQueLanca(() => {
        throw new AppError("Troque a senha para continuar", 403, "TROCA_SENHA_OBRIGATORIA");
      })
    ).get("/");
    expect(resposta.status).toBe(403);
    expect(resposta.body).toEqual({
      erro: "Troque a senha para continuar",
      codigo: "TROCA_SENHA_OBRIGATORIA",
    });
  });

  it("dados inválidos trazem o código DADOS_INVALIDOS", async () => {
    const resposta = await request(
      appQueLanca(() => {
        z.object({ nome: z.string() }).parse({});
        throw new Error("não deveria chegar aqui");
      })
    ).get("/");
    expect(resposta.status).toBe(400);
    expect(resposta.body).toMatchObject({ erro: "Dados inválidos", codigo: "DADOS_INVALIDOS" });
  });
});
