import { describe, expect, it } from "vitest";
import { api } from "../helpers/api";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("cabeçalhos de segurança HTTP", () => {
  it("aplica nosniff, Referrer-Policy e uma CSP que não libera nada", async () => {
    const resposta = await api().get("/api/health");
    expect(resposta.headers["x-content-type-options"]).toBe("nosniff");
    expect(resposta.headers["referrer-policy"]).toBe("no-referrer");
    expect(resposta.headers["x-frame-options"]).toBe("DENY");
    const csp = resposta.headers["content-security-policy"];
    expect(csp).toContain("default-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
  });

  it("não expõe X-Powered-By nem força HTTPS (acesso por HTTP na rede local)", async () => {
    const resposta = await api().get("/api/health");
    expect(resposta.headers["x-powered-by"]).toBeUndefined();
    expect(resposta.headers["strict-transport-security"]).toBeUndefined();
    expect(resposta.headers["content-security-policy"]).not.toContain("upgrade-insecure-requests");
  });

  it("proíbe cache das respostas da API", async () => {
    const resposta = await api().get("/api/health");
    expect(resposta.headers["cache-control"]).toBe("no-store");
  });

  it("mantém os cabeçalhos em respostas de erro", async () => {
    const naoAutenticado = await api().get("/api/pastilhas");
    const inexistente = await api().get("/nao-existe");
    for (const resposta of [naoAutenticado, inexistente]) {
      expect(resposta.headers["x-content-type-options"]).toBe("nosniff");
      expect(resposta.headers["content-security-policy"]).toContain("frame-ancestors 'none'");
      expect(resposta.headers["x-request-id"]).toMatch(UUID);
    }
  });

  it("gera um X-Request-Id quando a requisição não traz um", async () => {
    const resposta = await api().get("/api/health");
    expect(resposta.headers["x-request-id"]).toMatch(UUID);
  });

  it("devolve o X-Request-Id recebido quando é seguro e troca quando não é", async () => {
    const seguro = await api().get("/api/health").set("X-Request-Id", "painel-2026-abc");
    expect(seguro.headers["x-request-id"]).toBe("painel-2026-abc");
    const inseguro = await api().get("/api/health").set("X-Request-Id", "id com espaço");
    expect(inseguro.headers["x-request-id"]).toMatch(UUID);
  });

  it("deixa o frontend ler X-Request-Id e Retry-After via CORS", async () => {
    const resposta = await api().get("/api/health").set("Origin", "http://localhost:5173");
    const expostos = String(resposta.headers["access-control-expose-headers"]).toLowerCase();
    expect(expostos).toContain("x-request-id");
    expect(expostos).toContain("retry-after");
  });
});
