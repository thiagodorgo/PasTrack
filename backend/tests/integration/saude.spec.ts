import { describe, expect, it } from "vitest";
import { api } from "../helpers/api";

describe("infraestrutura da API", () => {
  it("GET /api/health responde ok com o banco disponível", async () => {
    const resposta = await api().get("/api/health");
    expect(resposta.status).toBe(200);
    expect(resposta.body).toMatchObject({ status: "ok", banco: "ok" });
    expect(typeof resposta.body.versao).toBe("string");
  });

  it("não expõe o cabeçalho X-Powered-By", async () => {
    const resposta = await api().get("/api/health");
    expect(resposta.headers["x-powered-by"]).toBeUndefined();
  });

  it("responde 404 em JSON fora da API", async () => {
    const resposta = await api().get("/nao-existe");
    expect(resposta.status).toBe(404);
    expect(resposta.body).toEqual({ erro: "Rota não encontrada" });
  });

  it("recusa JSON malformado com 400", async () => {
    const resposta = await api()
      .post("/api/auth/login")
      .set("Content-Type", "application/json")
      .send('{"email":');
    expect(resposta.status).toBe(400);
    expect(resposta.body).toEqual({ erro: "JSON malformado" });
  });

  it("recusa corpo acima de 100 kB com 413", async () => {
    const resposta = await api()
      .post("/api/auth/login")
      .send({ email: "x".repeat(120_000), senha: "x" });
    expect(resposta.status).toBe(413);
  });

  it("libera CORS só para as origens configuradas", async () => {
    const permitida = await api().get("/api/health").set("Origin", "http://localhost:5173");
    expect(permitida.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
    const desconhecida = await api().get("/api/health").set("Origin", "http://origem-desconhecida.test");
    expect(desconhecida.headers["access-control-allow-origin"]).toBeUndefined();
  });
});
