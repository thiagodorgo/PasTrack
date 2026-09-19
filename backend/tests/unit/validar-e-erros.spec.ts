import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { logger } from "../../src/config/logger";
import { AppError, capturar, tratarErros } from "../../src/middlewares/erros";
import { validar } from "../../src/middlewares/validar";
import { idParam } from "../../src/schemas/comum.schema";

function montarApp() {
  const app = express();
  app.use(express.json({ limit: "1kb" }));
  app.post(
    "/itens/:id",
    validar({ params: idParam, body: z.object({ nome: z.string().min(2) }).strict() }),
    (req, res) => {
      res.json({ id: req.params.id, tipoDoId: typeof req.params.id, corpo: req.body });
    }
  );
  app.get("/negado", () => {
    throw new AppError("sem permissão aqui", 403);
  });
  app.get(
    "/assincrono",
    capturar(async () => {
      throw new AppError("recurso inexistente", 404);
    })
  );
  app.get("/quebra", () => {
    throw new Error("detalhe interno do servidor");
  });
  app.use(tratarErros);
  return app;
}

describe("validar()", () => {
  it("converte e repassa os dados válidos", async () => {
    const resposta = await request(montarApp()).post("/itens/7").send({ nome: "Pastilha" });
    expect(resposta.status).toBe(200);
    expect(resposta.body).toEqual({ id: 7, tipoDoId: "number", corpo: { nome: "Pastilha" } });
  });

  it("recusa id não numérico com 400 e aponta o campo", async () => {
    const resposta = await request(montarApp()).post("/itens/abc").send({ nome: "Pastilha" });
    expect(resposta.status).toBe(400);
    expect(resposta.body.erro).toBe("Dados inválidos");
    expect(resposta.body.campos).toEqual(
      expect.arrayContaining([expect.objectContaining({ caminho: "id" })])
    );
  });

  it("recusa campos fora do esquema", async () => {
    const resposta = await request(montarApp()).post("/itens/1").send({ nome: "Pastilha", saldoAtual: 999 });
    expect(resposta.status).toBe(400);
    expect(resposta.body.erro).toBe("Dados inválidos");
  });

  it("recusa valores inválidos e aponta o campo", async () => {
    const resposta = await request(montarApp()).post("/itens/1").send({ nome: "x" });
    expect(resposta.status).toBe(400);
    expect(resposta.body.campos[0].caminho).toBe("nome");
  });
});

describe("tratarErros()", () => {
  it("usa o status do AppError", async () => {
    const resposta = await request(montarApp()).get("/negado");
    expect(resposta.status).toBe(403);
    expect(resposta.body).toEqual({ erro: "sem permissão aqui" });
  });

  it("captura erros de handlers assíncronos", async () => {
    const resposta = await request(montarApp()).get("/assincrono");
    expect(resposta.status).toBe(404);
    expect(resposta.body).toEqual({ erro: "recurso inexistente" });
  });

  it("devolve 500 sem vazar detalhes internos", async () => {
    const espiao = vi.spyOn(logger, "error").mockImplementation(() => undefined);
    const resposta = await request(montarApp()).get("/quebra");
    expect(resposta.status).toBe(500);
    expect(resposta.body).toEqual({ erro: "Erro interno no servidor" });
    expect(JSON.stringify(resposta.body)).not.toContain("detalhe interno");
    expect(espiao).toHaveBeenCalled();
  });

  it("devolve 400 para JSON malformado", async () => {
    const resposta = await request(montarApp())
      .post("/itens/1")
      .set("Content-Type", "application/json")
      .send('{"nome":');
    expect(resposta.status).toBe(400);
    expect(resposta.body).toEqual({ erro: "JSON malformado" });
  });

  it("devolve 413 para corpo grande demais", async () => {
    const resposta = await request(montarApp())
      .post("/itens/1")
      .send({ nome: "x".repeat(5_000) });
    expect(resposta.status).toBe(413);
    expect(resposta.body).toEqual({ erro: "Corpo da requisição grande demais" });
  });
});
