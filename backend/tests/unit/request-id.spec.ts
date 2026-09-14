import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { logger } from "../../src/config/logger";
import { tratarErros } from "../../src/middlewares/erros";
import { atribuirRequestId, escolherRequestId } from "../../src/middlewares/request-id";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("escolherRequestId", () => {
  it.each(["abc-123", "A_b-9", "x".repeat(64)])("aproveita o id seguro %s", (recebido) => {
    expect(escolherRequestId(recebido)).toBe(recebido);
  });

  it.each([
    ["longo demais", "x".repeat(65)],
    ["com espaço", "abc 123"],
    ["com quebra de linha", "abc\n123"],
    ["com caracteres de controle de log", '{"level":60}'],
    ["vazio", ""],
    ["repetido", ["a", "b"]],
    ["ausente", undefined],
  ])("gera um UUID quando o recebido está %s", (_caso, recebido) => {
    expect(escolherRequestId(recebido)).toMatch(UUID);
  });
});

describe("atribuirRequestId", () => {
  function montarApp() {
    const app = express();
    app.use(atribuirRequestId);
    app.get("/ok", (req, res) => {
      res.json({ id: req.id });
    });
    app.get("/quebra", () => {
      throw new Error("detalhe interno");
    });
    app.use(tratarErros);
    return app;
  }

  it("devolve o id recebido quando é seguro", async () => {
    const resposta = await request(montarApp()).get("/ok").set("X-Request-Id", "rastreio-42");
    expect(resposta.headers["x-request-id"]).toBe("rastreio-42");
    expect(resposta.body).toEqual({ id: "rastreio-42" });
  });

  it("troca o id recebido quando não é seguro", async () => {
    const resposta = await request(montarApp()).get("/ok").set("X-Request-Id", "x".repeat(65));
    expect(resposta.headers["x-request-id"]).toMatch(UUID);
  });

  it("inclui o requestId no 500 e registra o erro no logger", async () => {
    const espiao = vi.spyOn(logger, "error").mockImplementation(() => undefined);
    const resposta = await request(montarApp()).get("/quebra");
    const requestId = resposta.headers["x-request-id"];
    expect(resposta.status).toBe(500);
    expect(requestId).toMatch(UUID);
    expect(resposta.body).toEqual({ erro: "Erro interno no servidor", requestId });
    expect(espiao).toHaveBeenCalledWith(
      expect.objectContaining({ requestId, err: expect.any(Error) }),
      expect.any(String)
    );
  });
});
