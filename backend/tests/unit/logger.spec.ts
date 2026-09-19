import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { criarLogDeAcesso, criarLogger } from "../../src/config/logger";
import { atribuirRequestId } from "../../src/middlewares/request-id";

/** Destino em memória: guarda cada linha JSON que o logger escreveria na saída. */
function destinoEmMemoria() {
  const linhas: string[] = [];
  return {
    linhas,
    destino: {
      write(linha: string) {
        linhas.push(linha);
      },
    },
    registros: <T>() => linhas.map((linha) => JSON.parse(linha) as T),
  };
}

describe("criarLogger", () => {
  it("redige credenciais dos cabeçalhos e todos os campos de senha", () => {
    const { destino, linhas, registros } = destinoEmMemoria();
    const log = criarLogger({ nivel: "info", destino });

    log.info(
      {
        req: {
          headers: {
            authorization: "Bearer token-secreto",
            cookie: "sessao=cookie-secreto",
            accept: "application/json",
          },
        },
        corpo: {
          email: "ana@teste.local",
          senha: "segredo-1",
          senhaAtual: "segredo-2",
          novaSenha: "segredo-3",
          senhaHash: "segredo-4",
          senhaTemporaria: "segredo-5",
        },
        senha: "segredo-6",
      },
      "tentativa de login"
    );

    expect(linhas).toHaveLength(1);
    const [registro] = registros<{ req: unknown; corpo: unknown; senha: string }>();
    expect(registro.req).toEqual({
      headers: { authorization: "[Redacted]", cookie: "[Redacted]", accept: "application/json" },
    });
    expect(registro.corpo).toEqual({
      email: "ana@teste.local",
      senha: "[Redacted]",
      senhaAtual: "[Redacted]",
      novaSenha: "[Redacted]",
      senhaHash: "[Redacted]",
      senhaTemporaria: "[Redacted]",
    });
    expect(registro.senha).toBe("[Redacted]");
    expect(linhas[0]).not.toMatch(/secreto|segredo-\d/);
  });

  it("respeita o nível configurado", () => {
    const { destino, linhas } = destinoEmMemoria();
    const log = criarLogger({ nivel: "warn", destino });
    log.info("informação que não deve sair");
    log.warn("aviso que deve sair");
    expect(linhas).toHaveLength(1);
    expect(linhas[0]).toContain("aviso que deve sair");
  });
});

describe("criarLogDeAcesso", () => {
  function montarApp() {
    const memoria = destinoEmMemoria();
    const app = express();
    app.use(atribuirRequestId);
    app.use(criarLogDeAcesso(criarLogger({ nivel: "info", destino: memoria.destino })));
    app.get("/api/health", (_req, res) => {
      res.json({ status: "ok" });
    });
    app.get("/api/pastilhas", (_req, res) => {
      res.json([]);
    });
    app.get("/api/quebra", (_req, res) => {
      res.status(500).json({ erro: "Erro interno no servidor" });
    });
    return { app, ...memoria };
  }

  it("registra o request id e esconde Authorization e Cookie", async () => {
    const { app, linhas, registros } = montarApp();
    await request(app)
      .get("/api/pastilhas")
      .set("Authorization", "Bearer token-secreto")
      .set("Cookie", "sessao=cookie-secreto")
      .set("X-Request-Id", "req-teste-1");

    await vi.waitFor(() => expect(linhas).toHaveLength(1));
    const [registro] = registros<{
      level: number;
      req: { id: string; headers: Record<string, string> };
      res: { statusCode: number };
    }>();
    expect(registro.level).toBe(30);
    expect(registro.req.id).toBe("req-teste-1");
    expect(registro.req.headers.authorization).toBe("[Redacted]");
    expect(registro.req.headers.cookie).toBe("[Redacted]");
    expect(registro.res.statusCode).toBe(200);
    expect(linhas[0]).not.toContain("secreto");
  });

  it("usa warn para 4xx, error para 5xx e ignora a verificação de saúde que deu certo", async () => {
    const { app, linhas, registros } = montarApp();
    await request(app).get("/api/health");
    await request(app).get("/api/nao-existe");
    await request(app).get("/api/quebra");

    await vi.waitFor(() => expect(linhas).toHaveLength(2));
    const niveis = registros<{ level: number }>().map((registro) => registro.level);
    expect(niveis).toEqual([40, 50]);
  });

  it("registra a verificação de saúde quando ela falha", async () => {
    const memoria = destinoEmMemoria();
    const app = express();
    app.use(atribuirRequestId);
    app.use(criarLogDeAcesso(criarLogger({ nivel: "info", destino: memoria.destino })));
    app.get("/api/health", (_req, res) => {
      res.status(503).json({ erro: "Banco de dados indisponível" });
    });
    await request(app).get("/api/health");

    await vi.waitFor(() => expect(memoria.linhas).toHaveLength(1));
    expect(memoria.registros<{ level: number }>()[0].level).toBe(50);
  });
});
